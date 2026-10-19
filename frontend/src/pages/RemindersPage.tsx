import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Clock, ToggleLeft, ToggleRight, Save, CheckCircle,
  AlertTriangle, Target, Calendar, Check, Send
} from 'lucide-react';
import api from '../lib/api';
import type { ReminderSettings, Notification } from '../types';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { format, parseISO } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RemindersPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    budget_warnings: true,
    savings_milestones: true,
    monthly_reports: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [remRes, notifRes] = await Promise.allSettled([
        api.get<{ data: ReminderSettings }>('/reminders'),
        api.get<{ data: Notification[] }>('/notifications'),
      ]);

      if (remRes.status === 'fulfilled') {
        setSettings(remRes.value.data.data);
      } else {
        setSettings({ id: '', userId: '', enabled: true, time: '21:00', days: [1, 2, 3, 4, 5, 6, 0], updatedAt: '' });
      }

      if (notifRes.status === 'fulfilled') {
        setNotifications(notifRes.value.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleDay = (day: number) => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            days: prev.days.includes(day)
              ? prev.days.filter((d) => d !== day)
              : [...prev.days, day],
          }
        : prev
    );
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.put('/reminders', {
        enabled: settings.enabled,
        time: settings.time,
        days: settings.days,
        message: settings.message,
      });
      toast.success('Reminder settings saved successfully!');
    } catch {
      toast.error('Failed to save reminder settings');
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Ignored
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const sendTestNotification = () => {
    const newNotif: Notification = {
      id: `test-${Date.now()}`,
      userId: settings?.userId || '',
      type: 'reminder',
      title: '🔔 Test Reminder: Campus Expense Check',
      message: 'Great job staying on top of your budget! Don\'t forget to record today\'s snacks & canteen spending.',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    toast.success('Test notification triggered!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!settings) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reminders & Notifications</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Manage your daily expense check-in alerts, budget warnings, and financial updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={sendTestNotification}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
            id="test-reminder-btn"
          >
            <Send className="w-3.5 h-3.5 text-primary-400" />
            <span>Send Test Alert</span>
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
              id="mark-all-read-btn"
            >
              <Check className="w-3.5 h-3.5 text-success-400" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Schedule & Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Expense Reminder Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Daily Expense Reminder</h3>
                  <p className="text-gray-400 text-sm">
                    Receive an alert to record your daily college spending
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettings((p) => (p ? { ...p, enabled: !p.enabled } : p))}
                id="toggle-reminder-btn"
                className="focus:outline-none"
              >
                {settings.enabled ? (
                  <ToggleRight className="w-10 h-10 text-primary-400 transition-colors" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-500 transition-colors" />
                )}
              </button>
            </div>

            {settings.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2 border-t border-surface-600/40"
              >
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-400" /> Reminder Time
                  </label>
                  <input
                    type="time"
                    value={settings.time}
                    onChange={(e) =>
                      setSettings((p) => (p ? { ...p, time: e.target.value } : p))
                    }
                    className="input-field max-w-xs"
                    id="reminder-time-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Notification will be scheduled daily at {settings.time}
                  </p>
                </div>

                <div>
                  <label className="input-label flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-400" /> Days of Week
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((day, i) => {
                      const active = settings.days.includes(i);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(i)}
                          id={`day-${day.toLowerCase()}-btn`}
                          className={`w-11 h-10 rounded-xl text-xs font-semibold transition-all ${
                            active
                              ? 'bg-primary-600 text-white shadow-glow-primary scale-105'
                              : 'bg-surface-700 text-gray-400 hover:text-white'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
                id="save-reminders-btn"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Settings
              </button>
            </div>
          </motion.div>

          {/* Alert Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="text-white font-semibold">Notification Preferences</h3>
            {[
              {
                id: 'budget_warnings' as const,
                label: 'Budget Limit Warnings',
                desc: 'Alert when category spending reaches 80% or exceeds budget',
                icon: AlertTriangle,
                color: 'text-warning-400',
              },
              {
                id: 'savings_milestones' as const,
                label: 'Savings Goal Milestones',
                desc: 'Celebrate milestones and remind about target completion dates',
                icon: Target,
                color: 'text-success-400',
              },
              {
                id: 'monthly_reports' as const,
                label: 'Monthly Spending Reports',
                desc: 'Receive month-end financial breakdown and saving insights',
                icon: CheckCircle,
                color: 'text-primary-400',
              },
            ].map((pref) => {
              const active = preferences[pref.id];
              const Icon = pref.icon;
              return (
                <div
                  key={pref.id}
                  className="flex items-center justify-between py-3 border-b border-surface-600/30 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className={`w-4 h-4 ${pref.color}`} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{pref.label}</p>
                      <p className="text-gray-400 text-xs">{pref.desc}</p>
                    </div>
                  </div>
                  <button
                    id={`pref-${pref.id}-btn`}
                    onClick={() => {
                      setPreferences((p) => ({ ...p, [pref.id]: !p[pref.id] }));
                      toast.success(`${pref.label} ${!active ? 'enabled' : 'disabled'}`);
                    }}
                    className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors ${
                      active ? 'bg-primary-600' : 'bg-surface-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                        active ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Right Column: Live Notifications Feed */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-400" />
                <h3 className="text-white font-semibold text-sm">Recent Alerts</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-gray-300">
                {unreadCount} unread
              </span>
            </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-6">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      n.isRead
                        ? 'bg-surface-700/30 border-surface-600/30 opacity-70'
                        : 'bg-primary-600/10 border-primary-500/30 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-xs font-semibold leading-snug">
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-accent-400 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-gray-300 text-xs mt-1 leading-relaxed">{n.message}</p>
                    <p className="text-gray-500 text-[10px] mt-2">
                      {format(parseISO(n.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
