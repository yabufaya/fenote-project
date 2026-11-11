import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar, CheckCircle, Clock, Mail, Phone, Search, Tag, Trash2, XCircle, Ban, RefreshCw, Radio,
} from 'lucide-react';
import Modal from '../components/Modal';
import { bookingAPI } from '../services/api';
import { useAdminLiveRefresh } from '../hooks/useAdminLiveRefresh';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200/60',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  denied: 'bg-rose-50 text-rose-700 border-rose-200/60',
  expired: 'bg-slate-50 text-slate-600 border-slate-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200/60',
};

const formatSlot = (value) => {
  if (!value) return 'No time slot';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Addis_Ababa',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(value));
  } catch (_) {
    return String(value);
  }
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [actionType, setActionType] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await bookingAPI.getAllBookings();
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useAdminLiveRefresh(fetchBookings);

  const openAction = (booking, type) => {
    setSelectedBooking(booking);
    setActionType(type);
    setNotes('');
    setShowModal(true);
  };

  const statusForAction = { confirm: 'confirmed', deny: 'denied', cancel: 'cancelled' };
  const actionLabels = { confirm: 'Confirm booking', deny: 'Deny booking', cancel: 'Cancel booking' };

  const submitAction = async () => {
    if (!selectedBooking || !statusForAction[actionType]) return;
    setSaving(true);
    try {
      await bookingAPI.updateBookingStatus(selectedBooking.id, statusForAction[actionType], notes);
      toast.success(actionType === 'deny' ? 'Booking denied; the time slot is available again' : 'Booking updated');
      setShowModal(false);
      setSelectedBooking(null);
      await fetchBookings();
    } catch (error) {
      toast.error('Could not update booking');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this booking? This cannot be undone.')) return;
    try {
      await bookingAPI.deleteBooking(id);
      toast.success('Booking deleted; reserved slot released');
      await fetchBookings();
    } catch (error) {
      toast.error('Could not delete booking');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const needle = searchTerm.toLowerCase();
    const matchesSearch = String(b.patient_name || '').toLowerCase().includes(needle)
      || String(b.patient_email || '').toLowerCase().includes(needle)
      || String(b.patient_phone || '').toLowerCase().includes(needle);
    return matchesSearch && (statusFilter === 'all' || b.status === statusFilter);
  });

  if (loading) return <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bookings</h1>
            <p className="text-xs text-gray-400 font-medium mt-1">{bookings.length} total · live confirmation / denial</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5"><Radio className="w-3 h-3 animate-pulse" /> Live</span>
          <button type="button" onClick={fetchBookings} className="btn-secondary text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, email or phone…" className="input-field pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {['all', 'pending', 'confirmed', 'denied', 'expired', 'cancelled', 'completed'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === status ? 'bg-gray-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">No bookings match this view.</div>
        ) : filteredBookings.map((booking) => (
          <div key={booking.id} className="p-4 lg:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(booking.patient_name || '?').charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{booking.patient_name}</p>
                  <p className="text-[11px] text-gray-400 truncate">{booking.patient_email}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 mt-1.5">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{formatSlot(booking.slot_start)}</span>
                    {booking.patient_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{booking.patient_phone}</span>}
                    {booking.reason && <span className="inline-flex items-center gap-1"><Tag className="w-3 h-3" />{booking.reason}</span>}
                  </div>
                  {booking.status === 'pending' && booking.expires_at && (
                    <p className="text-[10px] text-amber-600 mt-1.5 inline-flex items-center gap-1"><Clock className="w-3 h-3" />Hold expires {formatSlot(booking.expires_at)}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`${STATUS_STYLES[booking.status] || 'bg-gray-50 text-gray-700 border-gray-200'} px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize`}>{booking.status}</span>
                {booking.status === 'pending' && (
                  <>
                    <button type="button" onClick={() => openAction(booking, 'confirm')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"><CheckCircle className="w-3.5 h-3.5" /> Confirm</button>
                    <button type="button" onClick={() => openAction(booking, 'deny')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60"><Ban className="w-3.5 h-3.5" /> Deny</button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <button type="button" onClick={() => openAction(booking, 'cancel')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60"><XCircle className="w-3.5 h-3.5" /> Cancel</button>
                )}
                <button type="button" onClick={() => handleDelete(booking.id)} className="btn-icon text-gray-300 hover:text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={actionLabels[actionType] || 'Update booking'} size="sm">
        {selectedBooking && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {actionType === 'deny'
                ? 'Denying releases this time slot back to the public booking form immediately.'
                : actionType === 'confirm'
                  ? 'Confirming keeps this time slot reserved.'
                  : 'Cancelling releases this time slot back to the public booking form.'}
            </p>
            <div className="p-3.5 bg-gray-50 rounded-xl text-xs text-gray-600">
              <p><span className="font-semibold">Patient:</span> {selectedBooking.patient_name}</p>
              <p className="mt-1"><span className="font-semibold">Slot:</span> {formatSlot(selectedBooking.slot_start)}</p>
              <p className="mt-1"><span className="font-semibold">Email:</span> {selectedBooking.patient_email}</p>
            </div>
            <label className="block text-xs font-semibold text-gray-700">Optional admin note</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-field" placeholder="Internal note only" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-sm">Close</button>
              <button type="button" disabled={saving} onClick={submitAction} className={actionType === 'confirm' ? 'btn-primary text-sm' : 'btn-danger text-sm'}>
                {saving ? 'Saving…' : actionLabels[actionType]}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
