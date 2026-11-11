import { useCallback, useEffect, useState } from 'react';
import {
  Mail, Users, UserPlus, CalendarDays, Search, Trash2, Download,
  RefreshCw, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { subscriberAPI } from '../services/api';
import { useAdminLiveRefresh } from '../hooks/useAdminLiveRefresh';

const Stat = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
    <p className="text-xs text-gray-400 font-medium">{label}</p>
  </div>
);

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, week: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSubscribers = useCallback(async () => {
    try {
      const res = await subscriberAPI.getSubscribers();
      setSubscribers(res.data.data || []);
      setStats(res.data.stats || { total: 0, today: 0, week: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);
  useAdminLiveRefresh(fetchSubscribers);

  const remove = async (id) => {
    if (!window.confirm('Remove this subscriber?')) return;
    try {
      await subscriberAPI.deleteSubscriber(id);
      toast.success('Subscriber removed');
      fetchSubscribers();
    } catch (err) { toast.error('Could not remove subscriber'); }
  };

  const exportCsv = () => {
    const rows = [['email', 'subscribed_at'], ...subscribers.map(s => [s.email, s.created_at])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fenote-subscribers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = subscribers.filter(s => s.email.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Subscribers</h1>
            <p className="text-xs text-gray-400 font-medium">Email-only newsletter list for later automation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSubscribers} className="btn-secondary text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button onClick={exportCsv} className="btn-primary text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={Users} label="Total subscribers" value={stats.total} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
        <Stat icon={UserPlus} label="New today" value={stats.today} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <Stat icon={CalendarDays} label="Last 7 days" value={stats.week} color="bg-gradient-to-br from-amber-500 to-orange-600" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscriber emails..."
            className="input-field pl-10"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {subscribers.length === 0 ? 'No subscribers yet. The footer form will add them here.' : 'No matching emails'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="py-3 px-2 font-semibold">Email</th>
                  <th className="py-3 px-2 font-semibold">Subscribed</th>
                  <th className="py-3 px-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition">
                    <td className="py-3 px-2 font-medium text-gray-800">{s.email}</td>
                    <td className="py-3 px-2 text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <button onClick={() => remove(s.id)} className="btn-icon text-gray-300 hover:text-red-500 hover:bg-red-50" title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
