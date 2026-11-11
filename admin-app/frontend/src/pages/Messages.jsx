import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare, Send, Inbox, Mail, CheckCircle2, Trash2, Loader2,
  RefreshCw, Clock, Users, Radio, Plus, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { contactMessageAPI, campaignAPI } from '../services/api';
import { useAdminLiveRefresh } from '../hooks/useAdminLiveRefresh';

const statusStyle = {
  draft: 'bg-gray-50 text-gray-600 border-gray-200',
  queued: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function Messages() {
  const [tab, setTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await contactMessageAPI.getContactMessages();
      setInbox(res.data.data || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await campaignAPI.getCampaigns();
      setCampaigns(res.data.data || []);
    } catch (err) { console.error(err); }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchInbox(), fetchCampaigns()]);
    setLoading(false);
  }, [fetchInbox, fetchCampaigns]);

  const seenBusyRef = useRef(false);
  const seenTimerRef = useRef(null);

  const clearNotificationDot = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      window.dispatchEvent(new CustomEvent('fenote:notifications-read'));
    } catch (_) { /* keep the UI responsive if the API is briefly unavailable */ }
  }, []);

  const markSeen = useCallback(async () => {
    if (seenBusyRef.current) return;
    seenBusyRef.current = true;
    try {
      await fetchAll();
      try { await contactMessageAPI.markAllAsRead(); } catch (_) {}
      await clearNotificationDot();
      await fetchInbox();
    } finally {
      seenBusyRef.current = false;
    }
  }, [fetchAll, fetchInbox, clearNotificationDot]);

  useEffect(() => {
    markSeen();
    return () => {
      if (seenTimerRef.current) clearTimeout(seenTimerRef.current);
    };
  }, [markSeen]);

  // Live events only refresh data. A new contact message may be marked seen
  // while this page is open; read-state UPDATE events never call markSeen.
  useAdminLiveRefresh((event) => {
    fetchAll();
    if (event?.table === 'contact_messages' && event?.action === 'insert') {
      if (seenTimerRef.current) clearTimeout(seenTimerRef.current);
      seenTimerRef.current = setTimeout(() => markSeen(), 300);
    }
  });

  const createCampaign = async (status) => {
    if (!subject.trim() || !body.trim()) return toast.error('Subject and body are required');
    setSaving(true);
    try {
      await campaignAPI.createCampaign({ subject, body, status });
      toast.success(status === 'draft' ? 'Draft saved' : 'Message queued for all subscribers');
      setSubject(''); setBody(''); setShowComposer(false);
      fetchCampaigns();
    } catch (err) { toast.error('Could not save message'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await campaignAPI.updateCampaignStatus(id, status);
      fetchCampaigns();
    } catch (err) { toast.error('Could not update status'); }
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Delete this subscriber message?')) return;
    try { await campaignAPI.deleteCampaign(id); fetchCampaigns(); } catch (err) { toast.error('Could not delete'); }
  };

  const markRead = async (id) => {
    try { await contactMessageAPI.markAsRead(id); await clearNotificationDot(); fetchInbox(); } catch (err) { console.error(err); }
  };
  const markAllRead = async () => {
    try { await contactMessageAPI.markAllAsRead(); await clearNotificationDot(); fetchInbox(); } catch (err) { console.error(err); }
  };
  const deleteMessage = async (id) => {
    if (!window.confirm('Delete this contact message?')) return;
    try { await contactMessageAPI.deleteContactMessage(id); fetchInbox(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>;

  const unread = inbox.filter(m => !m.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-sm">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <p className="text-xs text-gray-400 font-medium">Contact inbox + subscriber email drafts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
            <Radio className="w-3 h-3 animate-pulse" /> Live
          </span>
          <button onClick={fetchAll} className="btn-secondary text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        <button onClick={() => setTab('inbox')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${tab === 'inbox' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Inbox className="w-4 h-4" /> Inbox {unread > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{unread}</span>}
        </button>
        <button onClick={() => setTab('campaigns')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${tab === 'campaigns' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          <Send className="w-4 h-4" /> Subscriber messages
        </button>
      </div>

      {tab === 'inbox' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <div className="flex items-center justify-between p-4">
            <p className="text-sm text-gray-500">{inbox.length} messages · {unread} unread</p>
            {unread > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Mark all read</button>}
          </div>
          {inbox.length === 0 ? (
            <div className="text-center py-14 text-gray-400 text-sm">No contact messages yet.</div>
          ) : inbox.map((m) => (
            <div key={m.id} className={`p-4 lg:p-5 flex items-start gap-3 ${!m.is_read ? 'bg-blue-50/30' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!m.is_read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.name} <span className="text-xs font-normal text-gray-400">{m.email}</span></p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{m.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!m.is_read && <button onClick={() => markRead(m.id)} className="btn-icon text-blue-500 hover:bg-blue-50" title="Mark read"><CheckCircle2 className="w-4 h-4" /></button>}
                    <button onClick={() => deleteMessage(m.id)} className="btn-icon text-gray-300 hover:text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {!showComposer ? (
              <button onClick={() => setShowComposer(true)} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Write subscriber message</button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-800">New subscriber message</h2>
                  <button onClick={() => setShowComposer(false)} className="btn-icon text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
                </div>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="input-field" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body — stored for your later Gmail automation, not sent now." rows={5} className="input-field" />
                <div className="flex flex-wrap gap-2 justify-end">
                  <button disabled={saving} onClick={() => createCampaign('draft')} className="btn-secondary text-sm flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Save draft
                  </button>
                  <button disabled={saving} onClick={() => createCampaign('queued')} className="btn-primary text-sm flex items-center gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Queue to all subscribers
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">No external email is sent by this local patch. Queued rows are ready for your later automation.</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {campaigns.length === 0 ? (
              <div className="text-center py-14 text-gray-400 text-sm">No subscriber messages yet.</div>
            ) : campaigns.map((c) => (
              <div key={c.id} className="p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.subject}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusStyle[c.status] || statusStyle.draft}`}>{c.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.recipient_count} recipients</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(c.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {c.status !== 'queued' && <button onClick={() => updateStatus(c.id, 'queued')} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60">Queue</button>}
                  {c.status !== 'sent' && <button onClick={() => updateStatus(c.id, 'sent')} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60">Mark sent</button>}
                  <button onClick={() => deleteCampaign(c.id)} className="btn-icon text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
