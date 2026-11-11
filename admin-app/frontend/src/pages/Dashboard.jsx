import { useCallback, useEffect, useState } from 'react';
import { 
  Users, FileText, Star, Bell, Calendar, Clock, 
  TrendingUp, ArrowUpRight, ArrowDownRight, Activity,
  BookOpen, Download, ChevronRight, 
  CheckCircle2, XCircle, AlertCircle, Loader2,
  Building2, Monitor, Briefcase, Wallet, // ✅ NEW: Added Wallet
  Mail, MessageSquare, Radio, CalendarClock
} from 'lucide-react';
import api, { liveBookingAPI } from '../services/api';
import { useAdminLiveRefresh } from '../hooks/useAdminLiveRefresh';
import { adminPath } from '../lib/basePath';
import toast from 'react-hot-toast';

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <div className="stat-card animate-fade-in" style={{ animationDelay: delay }}>
    <div className="flex items-start justify-between mb-4">
      <div className={`stat-icon ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="stat-value">{value !== undefined && value !== null ? value : '—'}</p>
    <p className="stat-label">{label}</p>
    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${color.replace('bg-', 'from-').replace(' text-white', '').split(' ')[0]} to-transparent opacity-30`} />
  </div>
);

const BookingStatBadge = ({ icon: Icon, label, value, bgColor, iconColor, delay }) => (
  <div className={`p-4 rounded-xl ${bgColor} flex items-center gap-4 animate-fade-in`} style={{ animationDelay: delay }}>
    <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center shadow-sm`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [bookingStats, setBookingStats] = useState(null);
  const [todayBookings, setTodayBookings] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, notificationsRes, bookingStatsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/notifications?limit=10'),
        api.get('/dashboard/booking-stats')
      ]);

      setStats(statsRes.data.data);
      setRecentNotifications(notificationsRes.data.data || []);
      setRecentBookings(statsRes.data.data?.recentBookings || []);
      
      if (bookingStatsRes.data?.data) {
        setBookingStats(bookingStatsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayBookings = useCallback(async () => {
    try {
      const res = await liveBookingAPI.getTodayBookings();
      setTodayBookings(res.data.data || []);
    } catch (err) { console.error('Today bookings error:', err); }
  }, []);

  useAdminLiveRefresh(() => { fetchDashboardData(); fetchTodayBookings(); });

  useEffect(() => {
    fetchDashboardData();
    fetchTodayBookings();
  }, [fetchTodayBookings]);

  const getStatusBadge = (status) => {
    const map = {
      pending: 'badge-pending',
      confirmed: 'badge-confirmed',
      completed: 'badge-completed',
      cancelled: 'badge-cancelled',
    };
    return map[status] || 'bg-gray-50 text-gray-700 border border-gray-200 rounded-full px-3 py-1 text-xs font-medium';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="skeleton h-8 w-48 mb-2 rounded-lg" />
          <div className="skeleton h-4 w-72 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4 lg:gap-6">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-600" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <p className="text-gray-500 ml-11">Welcome back! Here's what's happening today.</p>
      </div>

      {/* ✅ UPDATED Stats Cards - 8 Columns on XL screens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4 lg:gap-6">
        <StatCard
          icon={BookOpen} label="Blogs" value={stats?.blogs} 
          color="bg-blue-500 text-white shadow-blue-500/30" delay="0s"
        />
        <StatCard
          icon={Download} label="Resources" value={stats?.resources} 
          color="bg-emerald-500 text-white shadow-emerald-500/30" delay="0.05s"
        />
        <StatCard
          icon={Briefcase} label="Services" value={stats?.services} 
          color="bg-teal-500 text-white shadow-teal-500/30" delay="0.1s"
        />
        <StatCard
          icon={Wallet} label="Packages" value={stats?.packages} 
          color="bg-amber-500 text-white shadow-amber-500/30" delay="0.15s"
        />
        <StatCard
          icon={Star} label="Testimonials" value={stats?.testimonials} 
          color="bg-yellow-500 text-white shadow-yellow-500/30" delay="0.2s"
        />
        <StatCard
          icon={Users} label="Team" value={stats?.team} 
          color="bg-purple-500 text-white shadow-purple-500/30" delay="0.25s"
        />
        <StatCard
          icon={Building2} label="Clients" value={stats?.clients} 
          color="bg-cyan-500 text-white shadow-cyan-500/30" delay="0.3s"
        />
        <StatCard
          icon={Monitor} label="Carousel" value={stats?.hero_slides} 
          color="bg-rose-500 text-white shadow-rose-500/30" delay="0.35s"
        />
        <StatCard
          icon={Mail} label="Subscribers" value={stats?.subscribers}
          color="bg-indigo-500 text-white shadow-indigo-500/30" delay="0.4s"
        />
        <StatCard
          icon={MessageSquare} label="Unread msgs" value={stats?.unreadMessages}
          color="bg-fuchsia-500 text-white shadow-fuchsia-500/30" delay="0.45s"
        />
      </div>

      {/* Booking Stats */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Booking Statistics</h2>
            <p className="text-sm text-gray-500">Overview of all booking statuses</p>
          </div>
          <a href={adminPath('/bookings')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 group">
            View all 
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <BookingStatBadge 
            icon={AlertCircle} label="Pending" value={bookingStats?.pending}
            bgColor="bg-amber-50/80" iconColor="bg-amber-500" delay="0.05s"
          />
          <BookingStatBadge 
            icon={CheckCircle2} label="Confirmed" value={bookingStats?.confirmed}
            bgColor="bg-blue-50/80" iconColor="bg-blue-500" delay="0.1s"
          />
          <BookingStatBadge 
            icon={CheckCircle2} label="Completed" value={bookingStats?.completed}
            bgColor="bg-emerald-50/80" iconColor="bg-emerald-500" delay="0.15s"
          />
          <BookingStatBadge 
            icon={XCircle} label="Cancelled" value={bookingStats?.cancelled}
            bgColor="bg-red-50/80" iconColor="bg-red-500" delay="0.2s"
          />
        </div>
      </div>

      {/* Today's Upcoming Bookings — live Supabase Realtime + SSE fallback */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8 animate-fade-in" style={{ animationDelay: '0.42s' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" /> Today's Upcoming Bookings
            </h2>
            <p className="text-sm text-gray-500">Pending / confirmed appointments for today, live-updated</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <Radio className="w-3 h-3 animate-pulse" /> Live
          </span>
        </div>
        {todayBookings.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-900 font-medium">No upcoming bookings today</p>
            <p className="text-sm text-gray-500 mt-1">New today appointments will appear here live</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayBookings.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-gray-50/60 hover:bg-gray-50 transition animate-fade-in" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{b.patient_name}</p>
                    <p className="text-xs text-gray-500 truncate">{b.appointment_time || 'Time TBD'} · {b.reason || 'Appointment'}</p>
                  </div>
                </div>
                <span className={getStatusBadge(b.status)}>{b.status?.charAt(0).toUpperCase() + b.status?.slice(1)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8 animate-fade-in" style={{ animationDelay: '0.45s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
              <p className="text-sm text-gray-500">Recent updates and alerts</p>
            </div>
            {recentNotifications.filter(n => !n.is_read).length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                {recentNotifications.filter(n => !n.is_read).length} new
              </span>
            )}
          </div>
          <div className="space-y-3">
            {recentNotifications.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-900 font-medium">No notifications</p>
                <p className="text-sm text-gray-500 mt-1">All caught up!</p>
              </div>
            ) : (
              recentNotifications.slice(0, 5).map((notif, i) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 rounded-xl transition-all duration-200 animate-fade-in ${
                    notif.is_read ? 'bg-white hover:bg-gray-50' : 'bg-primary-50/50 hover:bg-primary-50'
                  }`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    notif.is_read ? 'bg-gray-100 text-gray-400' : 'bg-primary-100 text-primary-600'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${notif.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <a href={adminPath('/notifications')} className="text-primary-600 hover:text-primary-700">
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              ))
            )}
          </div>
          {recentNotifications.length > 0 && (
            <a href={adminPath('/notifications')} className="mt-4 block text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2 hover:bg-primary-50/50 rounded-xl transition">
              View all notifications
            </a>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Bookings</h2>
              <p className="text-sm text-gray-500">Latest appointment requests</p>
            </div>
          </div>
          <div className="space-y-3">
            {recentBookings.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-gray-900 font-medium">No bookings yet</p>
                <p className="text-sm text-gray-500 mt-1">Your bookings will appear here</p>
              </div>
            ) : (
              recentBookings.slice(0, 5).map((booking, i) => (
                <div
                  key={booking.id}
                  className="p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900 text-sm">{booking.patient_name}</p>
                    <span className={getStatusBadge(booking.status)}>
                      {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{booking.patient_email}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Submitted: {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(booking.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentBookings.length > 0 && (
            <a href={adminPath('/bookings')} className="mt-4 block text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2 hover:bg-primary-50/50 rounded-xl transition">
              View all bookings
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
