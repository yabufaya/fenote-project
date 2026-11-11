import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, Loader2, Radio, RefreshCw, Save } from 'lucide-react';
import { bookingAvailabilityAPI } from '../services/api';
import { useAdminLiveRefresh } from '../hooks/useAdminLiveRefresh';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';

const DAYS = [
  { dow: 1, en: 'Monday', am: 'ሰኞ' },
  { dow: 2, en: 'Tuesday', am: 'ማክሰኞ' },
  { dow: 3, en: 'Wednesday', am: 'ረቡዕ' },
  { dow: 4, en: 'Thursday', am: 'ሐሙስ' },
  { dow: 5, en: 'Friday', am: 'ዓርብ' },
  { dow: 6, en: 'Saturday', am: 'ቅዳሜ' },
  { dow: 0, en: 'Sunday', am: 'እሁድ' },
];

const shortTime = (value) => String(value || '08:00').slice(0, 5);

export default function BookingAvailability() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ timezone: 'Africa/Addis_Ababa', days_ahead: 7, pending_hold_minutes: 30 });
  const [rules, setRules] = useState({});
  const [version, setVersion] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const response = await bookingAvailabilityAPI.get();
      const data = response.data.data;
      setSettings(data.settings || {});
      setVersion(Number(data.state?.version || 1));
      const next = {};
      for (const row of data.rules || []) {
        next[row.day_of_week] = {
          is_open: Boolean(row.is_open),
          open_time: shortTime(row.open_time),
          close_time: shortTime(row.close_time),
          slot_minutes: Number(row.slot_minutes || 30),
        };
      }
      setRules(next);
    } catch (error) {
      toast.error('Could not load booking availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useAdminLiveRefresh(fetchData);
  useSupabaseRealtime(['booking_availability_state'], fetchData);

  const updateRule = (dow, field, value) => {
    setRules((prev) => ({
      ...prev,
      [dow]: { ...(prev[dow] || {}), [field]: value },
    }));
  };

  const save = async () => {
    const payloadRules = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      day_of_week: dow,
      is_open: Boolean(rules[dow]?.is_open),
      open_time: shortTime(rules[dow]?.open_time || '08:00'),
      close_time: shortTime(rules[dow]?.close_time || '18:00'),
      slot_minutes: Number(rules[dow]?.slot_minutes || 30),
    }));
    for (const rule of payloadRules) {
      if (rule.is_open && rule.close_time <= rule.open_time) {
        toast.error(`${DAYS.find((d) => d.dow === rule.day_of_week)?.en}: close time must be after open time`);
        return;
      }
    }
    setSaving(true);
    try {
      const response = await bookingAvailabilityAPI.update({
        rules: payloadRules,
        settings: {
          days_ahead: Number(settings.days_ahead || 7),
          pending_hold_minutes: Number(settings.pending_hold_minutes || 30),
        },
      });
      const data = response.data.data;
      setSettings(data.settings || settings);
      setVersion(Number(data.state?.version || version));
      toast.success('Working hours and live slots updated');
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <CalendarClock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Booking Availability</h1>
            <p className="text-xs text-gray-400 font-medium mt-1">Admin-controlled weekly hours, slot length and pending-hold expiry.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <Radio className="w-3 h-3 animate-pulse" /> Live · v{version}
          </span>
          <button type="button" onClick={fetchData} className="btn-secondary text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900">
        Times use <strong>{settings.timezone || 'Africa/Addis_Ababa'}</strong>. A submitted booking removes its slot immediately. Confirmation keeps it reserved; denial or an expired pending hold makes it available again. No patient details are published to the public site.
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wide font-bold text-gray-500">
          <div className="col-span-4">Day / ቀን</div>
          <div className="col-span-2">Open</div>
          <div className="col-span-2">From</div>
          <div className="col-span-2">To</div>
          <div className="col-span-2">Minutes</div>
        </div>
        {DAYS.map((day) => {
          const rule = rules[day.dow] || { is_open: false, open_time: '08:00', close_time: '18:00', slot_minutes: 30 };
          return (
            <div key={day.dow} className="grid grid-cols-12 gap-3 px-5 py-3 items-center border-b border-gray-50 last:border-b-0">
              <div className="col-span-4">
                <p className="text-sm font-semibold text-gray-800">{day.en}</p>
                <p className="text-xs text-gray-400">{day.am}</p>
              </div>
              <label className="col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={rule.is_open} onChange={(e) => updateRule(day.dow, 'is_open', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                {rule.is_open ? 'Open' : 'Closed'}
              </label>
              <input type="time" value={rule.open_time} onChange={(e) => updateRule(day.dow, 'open_time', e.target.value)} className="col-span-2 input-field text-xs py-2" />
              <input type="time" value={rule.close_time} onChange={(e) => updateRule(day.dow, 'close_time', e.target.value)} className="col-span-2 input-field text-xs py-2" />
              <input type="number" min="5" max="240" step="5" value={rule.slot_minutes} onChange={(e) => updateRule(day.dow, 'slot_minutes', e.target.value)} className="col-span-2 input-field text-xs py-2" />
            </div>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">One-week booking window (1–7 days)</label>
          <input type="number" min="1" max="7" value={settings.days_ahead ?? 7} onChange={(e) => setSettings((s) => ({ ...s, days_ahead: e.target.value }))} className="input-field" />
          <p className="text-[11px] text-gray-400 mt-2">The public form shows a rolling window from today. Weekends stay closed unless opened here.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pending hold (minutes)</label>
          <input type="number" min="5" max="1440" step="5" value={settings.pending_hold_minutes ?? 30} onChange={(e) => setSettings((s) => ({ ...s, pending_hold_minutes: e.target.value }))} className="input-field" />
          <p className="text-[11px] text-gray-400 mt-2">Abandoned pending requests release their slot after this time.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save & rebuild live slots
        </button>
      </div>
    </div>
  );
}
