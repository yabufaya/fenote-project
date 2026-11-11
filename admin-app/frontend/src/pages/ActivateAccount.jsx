import { useEffect, useState } from 'react';
import { adminPath } from '../lib/basePath';
import { passwordIssue, PASSWORD_HINT, MIN_PASSWORD_LENGTH } from '../lib/passwordPolicy';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Brain, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogOut,
  Mail, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, inviteSupabase } from '../lib/supabase';
import api from '../services/api';

function readInviteParams() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  return {
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
    tokenHash: query.get('token_hash') || hash.get('token_hash'),
    type: query.get('type') || hash.get('type'),
    errorCode: query.get('error_code') || hash.get('error_code'),
    errorDescription:
      query.get('error_description') || hash.get('error_description') || '',
  };
}

function cleanInviteUrl() {
  window.history.replaceState({}, document.title, adminPath('/activate'));
}

function VisibilityToggle({ visible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
      aria-label={visible ? 'Hide password' : 'Show password'}
      title={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

export default function ActivateAccount() {
  const {
    user, adminProfile, loading, refreshAdminProfile, logout,
  } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [inviteUser, setInviteUser] = useState(null);
  const [inviteProfile, setInviteProfile] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    let active = true;

    const establishInviteSession = async () => {
      const params = readInviteParams();
      if (params.errorCode) {
        if (active) {
          setError(
            params.errorDescription ||
            'This invitation link is invalid or has expired. Ask the superadmin to resend it.',
          );
          setCheckingInvite(false);
        }
        return;
      }

      const hasImplicitTokens = params.accessToken && params.refreshToken;
      const hasTokenHash = params.tokenHash && params.type === 'invite';
      if (!hasImplicitTokens && !hasTokenHash) {
        if (active) setCheckingInvite(false);
        return;
      }

      try {
        let session = null;
        if (hasTokenHash) {
          const result = await inviteSupabase.auth.verifyOtp({
            token_hash: params.tokenHash,
            type: 'invite',
          });
          if (result.error) throw result.error;
          session = result.data?.session || null;
        } else {
          const result = await inviteSupabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
          if (result.error) throw result.error;
          session = result.data?.session || null;
        }
        if (!session?.access_token || !session.user) {
          throw new Error('The invitation link did not create a valid session.');
        }
        // Confirm the isolated client really has the invite session before
        // updateUser() is allowed to change the password.
        const { data: sessionCheck, error: sessionError } = await inviteSupabase.auth.getSession();
        if (sessionError || !sessionCheck?.session?.access_token) {
          throw new Error('The invitation session could not be verified. Open the link again.');
        }

        // Verify the invited email is still an active admin_profiles row.
        // Use the invite token directly; do not overwrite the main app's token.
        const profileResponse = await api.get('/admins/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!active) return;
        setInviteUser(session.user);
        setInviteProfile(profileResponse.data?.data || null);
        cleanInviteUrl();
      } catch (err) {
        if (active) {
          setError(err.message || 'This invitation link is invalid or has expired.');
        }
      } finally {
        if (active) setCheckingInvite(false);
      }
    };

    establishInviteSession();
    return () => { active = false; };
  }, []);

  const activeUser = inviteUser || (user && adminProfile ? user : null);
  const activeProfile = inviteProfile || adminProfile || null;

  const createPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const issue = passwordIssue(password, confirm);
    if (issue) {
      setError(issue);
      return;
    }
    setSaving(true);
    try {
      const client = inviteUser ? inviteSupabase : supabase;
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;

      if (inviteUser) {
        // Robust check: prove the new password can actually sign in before we
        // discard the temporary invite session. Supabase Auth owns the hash.
        const { error: verifyError } = await inviteSupabase.auth.signInWithPassword({
          email: inviteUser.email,
          password,
        });
        if (verifyError) {
          throw new Error(
            'Password was saved but verification failed. Use Reset Password and try again.',
          );
        }
        await inviteSupabase.auth.signOut().catch(() => {});
        setPasswordSaved(true);
        setMessage('Password created and verified. Sign in with your email and password, or Google.');
        setTimeout(() => navigate('/login'), 1400);
      } else {
        await refreshAdminProfile();
        setPasswordSaved(true);
        setMessage('Password created. You can now use it on the sign-in page.');
        setTimeout(() => navigate('/dashboard'), 1400);
      }
    } catch (err) {
      setError(err.message || 'Could not create the password. The link may have expired.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || checkingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 shadow-2xl shadow-primary-500/30 mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Activate admin account</h1>
          <p className="text-gray-400 text-sm mt-1">Use the exact invitation link sent to the allowlisted email.</p>
        </div>

        <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-7 shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {!activeUser && !passwordSaved && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-300" />
              </div>
              <h2 className="text-lg font-semibold text-white">Invitation required</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Public sign-up is disabled. Open the email invitation sent after the superadmin
                added your exact admin address. If it expired, ask the superadmin to use
                <strong> Resend invite</strong>.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition">
                Back to sign in <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {activeUser && !activeProfile && !passwordSaved && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Not linked yet</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                {activeUser.email || 'This account'} is signed in, but it is not an active admin email.
                Ask the superadmin to add this exact address, then resend the invitation.
              </p>
              <button onClick={logout} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}

          {activeUser && activeProfile && !passwordSaved && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-200">Admin email verified</p>
                  <p className="text-xs text-emerald-300/80 mt-0.5">{activeUser.email} · {activeProfile.role}</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <KeyRound className="w-4 h-4 text-primary-300" />
                  <h2 className="text-sm font-semibold text-white">Create your password</h2>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Required before first access. {PASSWORD_HINT}. After this, sign in with
                  email/password or your existing Google account.
                </p>
                <form onSubmit={createPassword} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`New password (${MIN_PASSWORD_LENGTH}+ characters)`}
                      className="w-full px-3.5 py-2.5 pr-11 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:border-primary-500 outline-none"
                    />
                    <VisibilityToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3.5 py-2.5 pr-11 bg-slate-900/60 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:border-primary-500 outline-none"
                    />
                    <VisibilityToggle visible={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
                  </div>
                  <p className="text-[11px] text-gray-500">{PASSWORD_HINT}.</p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Save password
                  </button>
                </form>
              </div>
            </div>
          )}

          {passwordSaved && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Password created</h2>
              <p className="text-sm text-gray-400">Continue to sign in.</p>
              <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-sm font-semibold text-white transition">
                Go to sign in <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
