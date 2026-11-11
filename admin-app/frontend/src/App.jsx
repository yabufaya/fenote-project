import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';
import { ADMIN_BASE, adminPath } from './lib/basePath';
import { supabase } from './lib/supabase';
import useContentVersion from './hooks/useContentVersion';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import ActivateAccount from './pages/ActivateAccount';
import Dashboard from './pages/Dashboard';
import Blogs from './pages/Blogs';
import Resources from './pages/Resources';
import Testimonials from './pages/Testimonials';
import Teams from './pages/Teams';
import TeamMembers from './pages/TeamMembers';
import Bookings from './pages/Bookings';
import BookingAvailability from './pages/BookingAvailability';
import Gallery from './pages/Gallery';
import Highlights from './pages/Highlights';
import Clients from './pages/Clients';
import Contact from './pages/Contact';
import Hero from './pages/Hero'; // ✅ Unified Hero Section
import Services from './pages/Services';
import About from './pages/About'; // ✅ New About Section
import Payments from './pages/Payments'; // ✅ New Payments Section
import Subscribers from './pages/Subscribers';
import Messages from './pages/Messages';
import Admins from './pages/Admins';

import { Toaster, toast } from 'react-hot-toast';
import {
  Bell, FileText, Image, Star, Users, LayoutDashboard, Calendar,
  BookOpen, Download, Award, Menu, X, LogOut, Settings, Sparkles,
  Building2, MapPin, Monitor, Briefcase, Type, Info, Wallet, // ✅ NEW ICONS
  Mail, MessageSquare, Radio, ShieldCheck, CalendarClock
} from 'lucide-react';

// One multiplexed, authenticated SSE connection for the whole admin SPA.
// Private tables are not in the public Supabase Realtime publication; database
// triggers send PII-free ids/status flags here instead.
const AdminLiveBridge = () => {
  const { isAuthenticated } = useAuth();

  // Keep every admin content section in sync even when Supabase Realtime's
  // WebSocket is unavailable. No polling while signed out.
  useContentVersion({ enabled: isAuthenticated });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    let eventSource = null;
    let subscription = null;

    const connect = (token) => {
      if (cancelled || !token) return;
      if (eventSource) eventSource.close();
      // Same-origin /api is proxied to the admin API by Vite / platform routes.
      const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
      const url = new URL(`${apiBase}/bookings/stream`, window.location.origin);
      url.searchParams.set('token', token);
      const source = new EventSource(url.toString());
      eventSource = source;
      source.addEventListener('adminEvent', (message) => {
        let event;
        try { event = JSON.parse(message.data); } catch (_) { return; }
        window.dispatchEvent(new CustomEvent('fenote:admin-event', { detail: event }));
        // Only true new rows refresh the unread dot. Read-state UPDATEs must not
        // dispatch here: auto-read would otherwise feed itself through SSE.
        if (event.action === 'insert' && ['notifications', 'contact_messages', 'bookings'].includes(event.table)) {
          window.dispatchEvent(new CustomEvent('fenote:admin-insert', { detail: event }));
        }
        if (event.table === 'bookings' && event.action === 'insert') {
          toast.success('New booking request received', { icon: '🔔' });
        }
        if (event.table === 'contact_messages' && event.action === 'insert') {
          toast.success('New contact message received', { icon: '✉️' });
        }
      });
      source.onerror = () => {
        // EventSource reconnects automatically; token refresh reconnects below.
      };
    };

    supabase.auth.getSession().then(({ data }) => connect(data?.session?.access_token)).catch(() => {});
    const authState = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) connect(session.access_token);
      else if (eventSource) { eventSource.close(); eventSource = null; }
    });
    subscription = authState?.data?.subscription || null;

    return () => {
      cancelled = true;
      if (subscription?.unsubscribe) subscription.unsubscribe();
      if (eventSource) eventSource.close();
    };
  }, [isAuthenticated]);

  return null;
};


const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, authError } = useAuth();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 px-4">
        <div className="w-full max-w-md text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="text-gray-600 text-sm font-semibold">Checking your admin session…</p>
          {authError && <p className="mt-3 text-xs text-rose-600">{authError}</p>}
          {slow && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="text-sm font-semibold text-amber-900">This is taking longer than expected.</p>
              <p className="mt-1 text-xs text-amber-800">
                Check that the admin API on port 5001 is running and that <code>VITE_API_URL</code> is correct.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => window.location.reload()} className="btn-primary text-xs">Retry</button>
                <Link to="/login" className="btn-secondary text-xs">Go to sign in</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const Sidebar = ({ sidebarOpen, setSidebarOpen, currentPath, user, logout, isSuperadmin }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', color: 'from-blue-500 to-blue-600', accent: '#3b82f6' },
    { icon: Calendar, label: 'Bookings', path: '/bookings', color: 'from-amber-500 to-orange-500', accent: '#f59e0b' },
    { icon: CalendarClock, label: 'Booking hours', path: '/booking-availability', color: 'from-amber-500 to-yellow-500', accent: '#eab308' },
    { icon: Mail, label: 'Subscribers', path: '/subscribers', color: 'from-blue-500 to-indigo-600', accent: '#6366f1' },
    { icon: MessageSquare, label: 'Messages', path: '/messages', color: 'from-violet-500 to-fuchsia-600', accent: '#a855f7' },
    ...(isSuperadmin ? [{ icon: ShieldCheck, label: 'Admin access', path: '/admins', color: 'from-rose-500 to-pink-600', accent: '#f43f5e' }] : []),

    { icon: Type, label: 'Hero Section', path: '/hero', color: 'from-orange-500 to-red-500', accent: '#f97316' },
    { icon: Info, label: 'About Us', path: '/about', color: 'from-teal-500 to-cyan-500', accent: '#14b8a6' },
    { icon: Briefcase, label: 'Services', path: '/services', color: 'from-teal-500 to-emerald-600', accent: '#10b981' },
    { icon: Wallet, label: 'Payments', path: '/payments', color: 'from-amber-500 to-orange-600', accent: '#eab308' },

    { icon: BookOpen, label: 'Blogs', path: '/blogs', color: 'from-indigo-500 to-violet-500', accent: '#6366f1' },
    { icon: Download, label: 'Resources', path: '/resources', color: 'from-emerald-500 to-teal-500', accent: '#10b981' },
    { icon: Image, label: 'Gallery', path: '/gallery', color: 'from-pink-500 to-rose-500', accent: '#ec4899' },
    { icon: Star, label: 'Testimonials', path: '/testimonials', color: 'from-yellow-500 to-amber-500', accent: '#eab308' },
    { icon: Users, label: 'Team', path: '/team', color: 'from-cyan-500 to-blue-500', accent: '#06b6d4' },
    { icon: Award, label: 'Team Members', path: '/team-members', color: 'from-orange-500 to-red-500', accent: '#f97316' },
    { icon: FileText, label: 'Highlights', path: '/highlights', color: 'from-purple-500 to-fuchsia-500', accent: '#a855f7' },
    { icon: Building2, label: 'Clients', path: '/clients', color: 'from-cyan-500 to-blue-500', accent: '#06b6d4' },
    { icon: MapPin, label: 'Contact Info', path: '/contact', color: 'from-emerald-500 to-teal-500', accent: '#10b981' },
  ];

  const isActive = (path) => currentPath === path;

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[272px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-[72px] px-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-white tracking-tight">Fenote Admin</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Management Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-0.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Menu</p>
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <a
                key={item.path}
                href={adminPath(item.path)}
                onClick={() => setSidebarOpen(false)}
                title={item.label}
                aria-current={active ? 'page' : undefined}
                style={{ '--nav-accent': item.accent }}
                className={`admin-nav-link group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none ${
                  active
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-blue-400 to-violet-500" />
                )}
                <div className={`admin-nav-icon w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  active
                    ? `bg-gradient-to-br ${item.color} shadow-md`
                    : 'bg-white/[0.04]'
                }`}>
                  <item.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span>{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
              </a>
            );
          })}
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3 px-2 py-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-white font-bold text-sm">{user?.email?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-blue-400 font-medium">Administrator</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 text-xs font-semibold group"
          >
            <LogOut className="w-3.5 h-3.5 group-hover:-rotate-12 transition-transform duration-300" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const MobileNav = ({ currentPath }) => {
  const mainItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard', accent: '#3b82f6' },
    { icon: Calendar, label: 'Book', path: '/bookings', accent: '#f59e0b' },
    { icon: BookOpen, label: 'Blogs', path: '/blogs', accent: '#6366f1' },
    { icon: Users, label: 'Team', path: '/team', accent: '#06b6d4' },
    { icon: Star, label: 'Reviews', path: '/testimonials', accent: '#eab308' },
  ];
  const isActive = (path) => currentPath === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-gray-200/60 px-2 py-1.5 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {mainItems.map((item) => (
          <a
            key={item.path}
            href={adminPath(item.path)}
            title={item.label}
            aria-current={isActive(item.path) ? 'page' : undefined}
            style={{ '--nav-accent': item.accent }}
            className={`mobile-bottom-link flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 focus:outline-none ${
              isActive(item.path) ? 'is-active' : 'text-gray-400'
            }`}
          >
            <span className="mobile-bottom-icon"><item.icon className="w-5 h-5" /></span>
            <span className="text-[10px] font-semibold">{item.label}</span>
            {isActive(item.path) && <div className="w-1 h-1 rounded-full" style={{ background: item.accent }} />}
          </a>
        ))}
      </div>
    </nav>
  );
};

const Layout = ({ children }) => {
  const { user, logout, isSuperadmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let active = true;
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await api.get('/notifications/unread-count');
        if (active) setUnreadNotifications(Number(response.data?.count || 0));
      } catch (_) { /* keep the last known count */ }
      finally { busy = false; }
    };
    const clear = () => setUnreadNotifications(0);
    refresh();
    window.addEventListener('fenote:admin-insert', refresh);
    window.addEventListener('fenote:notifications-read', clear);
    return () => {
      active = false;
      window.removeEventListener('fenote:admin-insert', refresh);
      window.removeEventListener('fenote:notifications-read', clear);
    };
  }, []);

  const pageTitle = {
    '/dashboard': 'Dashboard',
    '/bookings': 'Bookings',
    '/booking-availability': 'Booking Availability',
    '/subscribers': 'Subscribers',
    '/messages': 'Messages',
    '/admins': 'Admin access',
    '/hero': 'Hero Management',
    '/about': 'About Us',   // ✅ New
    '/services': 'Services',
    '/payments': 'Payment Settings', // ✅ New
    '/blogs': 'Blogs',
    '/resources': 'Resources',
    '/gallery': 'Gallery',
    '/testimonials': 'Testimonials',
    '/team': 'Team',
    '/team-members': 'Team Members',
    '/highlights': 'Highlights',
    '/clients': 'Trusted Companies',
    '/contact': 'Contact & Footer Info', // ✅ Updated title
  }[location.pathname] || 'Admin Panel';

  return (
    <div className="min-h-screen bg-gray-50/80">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentPath={location.pathname}
        user={user}
        logout={logout}
        isSuperadmin={isSuperadmin}
      />

      <div className="lg:ml-[272px] min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{pageTitle}</h1>
                <p className="text-[11px] text-gray-400 hidden sm:block font-medium">
                  Welcome, {user?.email?.split('@')[0] || 'Admin'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={adminPath('/notifications')} className="relative p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />}
              </a>
              <div className="hidden sm:flex items-center gap-2.5 ml-1 pl-3 border-l border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xs">{user?.email?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-gray-800">{user?.email?.split('@')[0]}</p>
                  <p className="text-[10px] text-gray-400">Admin</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 xl:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      <MobileNav currentPath={location.pathname} />
    </div>
  );
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const [allRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);
      setNotifications(allRes.data.data || []);
      setUnreadCount(Number(countRes.data.count || 0));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllAsRead = useCallback(async (silent = false) => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((rows) => rows.map((row) => ({ ...row, is_read: true })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('fenote:notifications-read'));
    } catch (error) {
      if (!silent) console.error('Error marking all as read:', error);
    }
  }, []);

  useEffect(() => {
    let busy = false;
    let timer = null;
    const seen = async () => {
      if (busy) return;
      busy = true;
      try {
        await fetchNotifications();
        await markAllAsRead(true);
      } finally { busy = false; }
    };
    const scheduleSeen = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(seen, 300);
    };
    seen();
    window.addEventListener('fenote:admin-insert', scheduleSeen);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('fenote:admin-insert', scheduleSeen);
    };
  }, [fetchNotifications, markAllAsRead]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await fetchNotifications();
      window.dispatchEvent(new CustomEvent('fenote:notifications-read'));
    } catch (error) { console.error('Error marking as read:', error); }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      await fetchNotifications();
      window.dispatchEvent(new CustomEvent('fenote:notifications-read'));
    } catch (error) { console.error('Error deleting notification:', error); }
  };

  if (loading) return <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllAsRead(false)} className="btn-primary text-sm"><Bell className="w-4 h-4" /> Mark All Read</button>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-200" />
            </div>
            <p className="text-gray-800 font-semibold">No notifications</p>
            <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
          </div>
        ) : notifications.map((n, i) => (
          <div key={n.id} className={`p-4 lg:p-5 hover:bg-gray-50/50 transition-all animate-fade-in ${!n.is_read ? 'bg-blue-50/30' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.is_read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-semibold ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {!n.is_read && (
                      <button onClick={() => markAsRead(n.id)} className="btn-icon text-blue-500 hover:bg-blue-50" title="Mark read">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </button>
                    )}
                    <button onClick={() => deleteNotification(n.id)} className="btn-icon text-gray-300 hover:text-red-500 hover:bg-red-50" title="Delete">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 font-medium">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AdminLiveBridge />
      <BrowserRouter basename={ADMIN_BASE || '/'}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/activate" element={<ActivateAccount />} />
          <Route path="/" element={<ProtectedRoute><Layout><Navigate to="/dashboard" replace /></Layout></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationCenter /></Layout></ProtectedRoute>} />
          
          <Route path="/hero" element={<ProtectedRoute><Layout><Hero /></Layout></ProtectedRoute>} /> {/* ✅ Unified Hero */}
          <Route path="/about" element={<ProtectedRoute><Layout><About /></Layout></ProtectedRoute>} /> {/* ✅ New */}
          <Route path="/payments" element={<ProtectedRoute><Layout><Payments /></Layout></ProtectedRoute>} /> {/* ✅ New */}
          
          <Route path="/blogs" element={<ProtectedRoute><Layout><Blogs /></Layout></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><Layout><Resources /></Layout></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><Layout><Services /></Layout></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute><Layout><Gallery /></Layout></ProtectedRoute>} />
          <Route path="/testimonials" element={<ProtectedRoute><Layout><Testimonials /></Layout></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Layout><Teams /></Layout></ProtectedRoute>} />
          <Route path="/team-members" element={<ProtectedRoute><Layout><TeamMembers /></Layout></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><Layout><Bookings /></Layout></ProtectedRoute>} />
          <Route path="/booking-availability" element={<ProtectedRoute><Layout><BookingAvailability /></Layout></ProtectedRoute>} />
          <Route path="/subscribers" element={<ProtectedRoute><Layout><Subscribers /></Layout></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />
          <Route path="/admins" element={<ProtectedRoute><Layout><Admins /></Layout></ProtectedRoute>} />
          <Route path="/highlights" element={<ProtectedRoute><Layout><Highlights /></Layout></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><Layout><Clients /></Layout></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><Layout><Contact /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;