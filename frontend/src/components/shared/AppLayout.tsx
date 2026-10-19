import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, MessageCircle, Receipt, PieChart, Target,
  BarChart3, Bell, Settings, LogOut, Menu, X, ChevronRight,
  Wallet,
} from 'lucide-react';
import { useAuthStore, useUser } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'AI Chat' },
  { to: '/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/budgets', icon: PieChart, label: 'Budgets' },
  { to: '/savings', icon: Target, label: 'Savings Goals' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/reminders', icon: Bell, label: 'Reminders' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const user = useUser();
  const { signOut } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Fetch notifications
    const fetchNotifs = async () => {
      try {
        const { data } = await api.get('/notifications');
        if (data.data) {
          setNotifications(data.data);
        }
      } catch {
        // Ignored
      }
    };
    fetchNotifs();
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Sign out failed');
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Ignored
    }
  };

  const getPageTitle = () => {
    const item = navItems.find((n) => n.to === location.pathname);
    return item?.label || 'MyKanakku';
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen flex bg-surface-900" onClick={() => notifOpen && setNotifOpen(false)}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-800/95 backdrop-blur-xl border-r border-surface-600/50 z-40 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:h-screen lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-surface-600/50">
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg leading-none">MyKanakku</h1>
              <p className="text-xs text-gray-500 mt-0.5">Smart Tracker</p>
            </div>
          </NavLink>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `nav-item group ${isActive ? 'active' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-400' : 'text-gray-500 group-hover:text-white'}`} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 text-primary-400" />}
                  {to === '/chat' && (
                    <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse-slow" />
                  )}
                  {to === '/reminders' && unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-accent-500 text-white">
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-surface-600/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-glow-primary">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.fullName || 'Student'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full nav-item text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
            id="sign-out-btn"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0 overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-surface-800/80 backdrop-blur-xl border-b border-surface-600/50 px-4 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-surface-700/50"
              id="sidebar-open-btn"
              title="Open Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-white leading-tight">{getPageTitle()}</h2>
              {location.pathname !== '/dashboard' && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                  <NavLink to="/dashboard" className="hover:text-primary-400 transition-colors">Dashboard</NavLink>
                  <span>/</span>
                  <span className="text-gray-300">{getPageTitle()}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {location.pathname !== '/dashboard' && (
              <NavLink
                to="/dashboard"
                className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-1.5 hover:border-primary-500/50 font-medium"
                id="header-dashboard-btn"
              >
                <LayoutDashboard className="w-4 h-4 text-primary-400" />
                <span>Dashboard</span>
              </NavLink>
            )}

            {/* Notification Bell Dropdown */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="btn-secondary p-2 rounded-xl relative text-gray-300 hover:text-white"
                id="header-notification-bell-btn"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 glass-card p-3 shadow-2xl border border-surface-500/50 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-600/50">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-primary-400" /> Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] text-primary-400 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">No notifications</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-lg text-xs transition-colors ${
                            n.isRead ? 'bg-surface-700/20 opacity-70' : 'bg-primary-600/10 border border-primary-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{n.title}</span>
                            {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />}
                          </div>
                          <p className="text-gray-300 mt-0.5 leading-snug">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 mt-2 border-t border-surface-600/50 text-center">
                    <NavLink
                      to="/reminders"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                    >
                      View All & Settings →
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            {location.pathname !== '/chat' && (
              <NavLink
                to="/chat"
                className="btn-primary py-1.5 px-3.5 text-sm flex items-center gap-2"
                id="quick-chat-btn"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">AI Chat</span>
              </NavLink>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
