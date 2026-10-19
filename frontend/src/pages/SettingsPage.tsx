import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Globe, Trash2, Shield, Bell, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuthStore, useUser } from '../store/authStore';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'ml', label: '🇮🇳 Malayalam' },
  { value: 'hi', label: '🇮🇳 Hindi' },
  { value: 'ta', label: '🇮🇳 Tamil' },
  { value: 'kn', label: '🇮🇳 Kannada' },
  { value: 'te', label: '🇮🇳 Telugu' },
  { value: 'bn', label: '🇮🇳 Bengali' },
];

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'GBP', label: '£ British Pound (GBP)' },
];

export default function SettingsPage() {
  const user = useUser();
  const { updateProfile, deleteAccount, signOut } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ fullName, language, currency });
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) { toast.error('Passwords do not match'); return; }
    if (passwordForm.newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
      if (error) throw error;
      setPasswordForm({ current: '', newPass: '', confirm: '' });
      toast.success('Password changed!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally { setChangingPassword(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    try {
      await deleteAccount();
      toast.success('Account deleted');
    } catch { toast.error('Failed to delete account. Contact support.'); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Account & Security Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Manage your profile, security, and preferences</p>
      </div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-primary-400" />
          <h3 className="text-white font-semibold">Profile</h3>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4" id="profile-form">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-bold text-2xl shadow-glow-primary">
              {fullName.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <p className="text-white font-medium">{fullName || 'Student'}</p>
              <p className="text-gray-400 text-sm flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {user?.email}
              </p>
            </div>
          </div>
          <div>
            <label className="input-label">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" id="settings-fullname" />
          </div>
          <div>
            <label className="input-label flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field" id="settings-language">
              {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-field" id="settings-currency">
              {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary" id="save-profile-btn">
            {saving ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : 'Save Profile'}
          </button>
        </form>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-primary-400" />
          <h3 className="text-white font-semibold">Security</h3>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4" id="change-password-form">
          <h4 className="text-white text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h4>
          {['current', 'newPass', 'confirm'].map((field) => (
            <div key={field}>
              <label className="input-label">{field === 'current' ? 'Current Password' : field === 'newPass' ? 'New Password' : 'Confirm New Password'}</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwordForm[field as keyof typeof passwordForm]}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, [field]: e.target.value }))}
                  className="input-field pr-10"
                  id={`password-${field}`}
                  placeholder="••••••••"
                />
                {field === 'current' && (
                  <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="submit" disabled={changingPassword} className="btn-secondary" id="change-password-btn">
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-surface-600/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-white text-sm font-medium">Active Sessions</p>
                <p className="text-gray-400 text-xs">Sign out from all devices</p>
              </div>
            </div>
            <button onClick={() => { signOut(); }} className="btn-secondary text-sm py-2" id="sign-out-all-btn">
              Sign Out All
            </button>
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 border-danger-500/30">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-danger-400" />
          <h3 className="text-danger-400 font-semibold">Danger Zone</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Permanently delete your account and all associated data including transactions, budgets, savings goals, and conversations. This action cannot be undone.
        </p>
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger text-sm" id="delete-account-btn">
            <Trash2 className="w-4 h-4 inline mr-2" /> Delete My Account
          </button>
        ) : (
          <div className="space-y-3 p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl">
            <p className="text-danger-300 text-sm">Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
            <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="input-field border-danger-500/50" placeholder="DELETE" id="delete-confirm-input" />
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="btn-secondary text-sm flex-1">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE'} className="btn-danger text-sm flex-1 disabled:opacity-50" id="confirm-delete-btn">Delete Account</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
