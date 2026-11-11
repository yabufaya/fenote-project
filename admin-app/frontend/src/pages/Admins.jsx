import { useEffect, useState } from 'react';
import { Shield, UserPlus, Trash2, Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminProfileAPI } from '../services/api';

export default function Admins() {
  const [rows, setRows] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(0);

  const load = async () => {
    try {
      const res = await adminProfileAPI.list();
      setRows(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load admin list');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      const res = await adminProfileAPI.create(email.trim());
      setEmail('');
      toast.success(
        res.data.inviteStatus === 'existing-account'
          ? 'Email added to the active allowlist. It already has a Supabase account.'
          : 'Admin email added. A Supabase invitation was sent.',
      );
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add admin');
    } finally { setSaving(false); }
  };

  const resendInvite = async (row) => {
    setInviting(row.id);
    try {
      const res = await adminProfileAPI.invite(row.id);
      toast.success(
        res.data.inviteStatus === 'existing-account'
          ? 'That Supabase account already exists; no new email was needed.'
          : 'Invitation sent to the allowlisted email.',
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send invitation');
    } finally { setInviting(0); }
  };

  const toggle = async (row) => {
    try { await adminProfileAPI.setActive(row.id, !row.is_active); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not update admin'); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Revoke admin access for ${row.email}?`)) return;
    try { await adminProfileAPI.remove(row.id); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not remove admin'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-sm"><Shield className="w-5 h-5 text-white" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Admin access</h1><p className="text-xs text-gray-400 font-medium">Superadmin only — other admins cannot see this page.</p></div>
      </div>

      <form onSubmit={add} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="new-admin@example.com" className="input-field pl-9" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary justify-center disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Add admin
        </button>
      </form>

      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs text-blue-800 leading-relaxed">
        The superadmin adds an <strong>email only</strong>. The backend sends a Supabase invitation
        <strong> only to that exact active allowlist address</strong>. The invitee opens the email
        link, creates an <strong>8+ character password</strong>, then signs in. Google remains an
        option for admins who already exist in Supabase Auth with an active profile — it never
        creates a new admin account. There is no public sign-up button or public activation endpoint.
      </div>

      {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {rows.map((row) => (
            <div key={row.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{row.email}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{row.role === 'superadmin' ? 'Superadmin' : 'Admin'} · {row.auth_user_id ? 'Linked to Supabase Auth' : 'Invitation pending'}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${row.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                {row.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{row.is_active ? 'Active' : 'Disabled'}
              </span>
              {row.role !== 'superadmin' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resendInvite(row)}
                    disabled={!row.is_active || inviting === row.id}
                    className="btn-secondary text-xs py-2 disabled:opacity-50"
                    title="Resend the Supabase invitation to this exact allowlisted email"
                  >
                    {inviting === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Resend invite
                  </button>
                  <button onClick={() => toggle(row)} className="btn-secondary text-xs py-2">{row.is_active ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => remove(row)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Revoke access"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
