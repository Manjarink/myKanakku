import { create } from 'zustand';
import type { ChatMessage, Conversation, ParsedTransaction } from '../types';
import api from '../lib/api';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  pendingTransactions: ParsedTransaction[] | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Conversation management
  fetchConversations: () => Promise<void>;
  createConversation: () => Promise<string>;
  setActiveConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  // Messaging
  sendMessage: (content: string, onReset?: () => void) => Promise<void>;
  confirmTransactions: (transactions: ParsedTransaction[]) => Promise<void>;
  cancelPendingAction: () => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  pendingTransactions: null,
  isLoading: false,
  isSending: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<{ data: Conversation[] }>('/conversations');
      const convs = data.data || [];
      set({ conversations: convs, isLoading: false });

      // Auto-load latest conversation if none active
      const { activeConversationId } = get();
      if (!activeConversationId && convs.length > 0) {
        const latest = convs[0];
        set({ isLoading: true, activeConversationId: latest.id });
        try {
          const msgRes = await api.get<{ data: ChatMessage[] }>(`/conversations/${latest.id}/messages`);
          set({ messages: msgRes.data.data || [], isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      }
    } catch {
      set({ isLoading: false });
    }
  },

  createConversation: async () => {
    const { data } = await api.post<{ data: Conversation }>('/conversations');
    const conv = data.data;
    set((state) => ({
      conversations: [conv, ...state.conversations],
      activeConversationId: conv.id,
      messages: [],
    }));
    return conv.id;
  },

  setActiveConversation: async (id) => {
    set({ isLoading: true, activeConversationId: id });
    try {
      const { data } = await api.get<{ data: ChatMessage[] }>(`/conversations/${id}/messages`);
      set({ messages: data.data || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  deleteConversation: async (id) => {
    await api.delete(`/conversations/${id}`);
    set((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id);
      const newActive = state.activeConversationId === id
        ? (conversations[0]?.id || null)
        : state.activeConversationId;
      return {
        conversations,
        activeConversationId: newActive,
        messages: state.activeConversationId === id ? [] : state.messages,
      };
    });
  },

  sendMessage: async (content, onReset) => {
    const { activeConversationId } = get();
    let conversationId = activeConversationId;

    if (!conversationId) {
      conversationId = await get().createConversation();
    }

    // Optimistic user message
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, userMsg], isSending: true }));

    try {
      const { data } = await api.post<{ data: ChatMessage }>(`/chat/${conversationId}/message`, {
        content,
      });

      const aiMsg = data.data;

      // Handle reset_all_expenses: refresh dashboard and clear pending state
      if (aiMsg.intent === 'reset_all_expenses') {
        set((state) => ({
          messages: [...state.messages, aiMsg],
          isSending: false,
          pendingTransactions: null,
        }));
        // Notify parent to refresh dashboard
        if (onReset) onReset();
        await get().fetchConversations();
        return;
      }

      set((state) => ({
        messages: [...state.messages, aiMsg],
        isSending: false,
        pendingTransactions: aiMsg.parsedTransactions || null,
      }));

      // Update conversation list
      await get().fetchConversations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      set((state) => ({
        messages: [...state.messages, {
          id: `err-${Date.now()}`,
          conversationId,
          role: 'assistant' as const,
          content: `❌ Error: ${message}. Please check your connection or try again.`,
          createdAt: new Date().toISOString(),
        }],
        isSending: false,
      }));
    }
  },

  confirmTransactions: async (transactions) => {
    const { activeConversationId } = get();
    if (!activeConversationId) return;

    set({ isSending: true });
    try {
      const { data } = await api.post<{ data: ChatMessage }>(`/chat/${activeConversationId}/confirm`, {
        transactions,
      });
      set((state) => ({
        messages: [
          ...state.messages.map((m) =>
            m.parsedTransactions?.length ? { ...m, parsedTransactions: undefined } : m
          ),
          data.data,
        ],
        pendingTransactions: null,
        isSending: false,
      }));
    } catch (err: unknown) {
      set({ isSending: false });
      throw err;
    }
  },

  cancelPendingAction: () => {
    set({ pendingTransactions: null });
  },

  clearMessages: () => set({ messages: [], pendingTransactions: null }),
}));
