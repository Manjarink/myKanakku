import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';
import api from '../lib/api';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      initialize: async () => {
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            try {
              const { data } = await api.get<{ data: UserProfile }>('/users/profile');
              set({ user: data.data, isAuthenticated: true, isLoading: false });
            } catch {
              set({
                user: {
                  id: session.user.id,
                  email: session.user.email || '',
                  fullName: session.user.user_metadata?.full_name || 'Student',
                  currency: 'INR',
                  language: 'en',
                  notificationsEnabled: true,
                  twoFactorEnabled: false,
                  createdAt: session.user.created_at,
                  updatedAt: session.user.created_at,
                },
                isAuthenticated: true,
                isLoading: false,
              });
            }
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }

        // Listen to auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            set({ user: null, isAuthenticated: false });
          } else if (session?.user) {
            try {
              const { data } = await api.get<{ data: UserProfile }>('/users/profile');
              set({ user: data.data, isAuthenticated: true });
            } catch {
              set({
                user: {
                  id: session.user.id,
                  email: session.user.email || '',
                  fullName: session.user.user_metadata?.full_name || 'Student',
                  currency: 'INR',
                  language: 'en',
                  notificationsEnabled: true,
                  twoFactorEnabled: false,
                  createdAt: session.user.created_at,
                  updatedAt: session.user.created_at,
                },
                isAuthenticated: true,
              });
            }
          }
        });
      },

      signUp: async (email, password, fullName) => {
        set({ isLoading: true, error: null });
        try {
          // Register via backend (creates pre-confirmed account to avoid email rate limits)
          await api.post('/auth/register', { email, password, fullName });

          // Instantly sign in with confirmed credentials
          const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw signInErr;

          try {
            const { data } = await api.get<{ data: UserProfile }>('/users/profile');
            set({ user: data.data, isAuthenticated: true, isLoading: false });
          } catch {
            const authUser = authData.user;
            set({
              user: {
                id: authUser.id,
                email: authUser.email || email,
                fullName: authUser.user_metadata?.full_name || fullName,
                currency: 'INR',
                language: 'en',
                notificationsEnabled: true,
                twoFactorEnabled: false,
                createdAt: authUser.created_at,
                updatedAt: authUser.created_at,
              },
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { error?: string } } };
          const message = axiosErr.response?.data?.error || (err instanceof Error ? err.message : 'Registration failed');
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;

          try {
            const { data } = await api.get<{ data: UserProfile }>('/users/profile');
            set({ user: data.data, isAuthenticated: true, isLoading: false });
          } catch {
            const authUser = authData.user;
            set({
              user: {
                id: authUser.id,
                email: authUser.email || email,
                fullName: authUser.user_metadata?.full_name || 'Student',
                currency: 'INR',
                language: 'en',
                notificationsEnabled: true,
                twoFactorEnabled: false,
                createdAt: authUser.created_at,
                updatedAt: authUser.created_at,
              },
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ error: message, isLoading: false, isAuthenticated: false });
          throw err;
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false });
      },

      resetPassword: async (email) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          });
          if (error) throw error;
          set({ isLoading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Password reset failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.put<{ data: UserProfile }>('/users/profile', data);
          set({ user: response.data.data, isLoading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Profile update failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      deleteAccount: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.delete('/users/account');
          await supabase.auth.signOut();
          set({ user: null, isAuthenticated: false, isLoading: false });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Account deletion failed';
          set({ error: message, isLoading: false });
          throw err;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'mykanakku-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Selector hooks
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
