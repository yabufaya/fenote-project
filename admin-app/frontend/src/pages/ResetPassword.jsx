import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Brain, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { passwordIssue, PASSWORD_HINT, MIN_PASSWORD_LENGTH } from '../lib/passwordPolicy';

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

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const issue = passwordIssue(password, confirm);
    if (issue) {
      setError(issue);
      return;
    }

    setLoading(true);
    try {
      const issueUpdate = await supabase.auth.updateUser({ password });
      if (issueUpdate.error) throw issueUpdate.error;

      // Robust check: prove the new password can sign in before we leave the
      // recovery session. Supabase Auth owns the password hash.
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const email = userData?.user?.email;
      if (!email) throw new Error('Could not identify the account for verification.');

      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password });
      if (verifyError) {
        throw new Error('Password was updated but verification failed. Use Reset Password again.');
      }
      await supabase.auth.signOut().catch(() => {});

      setMessage('Password updated and verified. Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message || 'Could not update password. The reset link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/60 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set a new password</h1>
          <p className="text-gray-400 text-sm mt-2">Fenote Admin</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-10 pr-11 py-2.5 text-white outline-none focus:border-primary-500"
                placeholder={PASSWORD_HINT}
                required
              />
              <VisibilityToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-10 pr-11 py-2.5 text-white outline-none focus:border-primary-500"
                placeholder="Repeat password"
                required
              />
              <VisibilityToggle visible={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            {PASSWORD_HINT}. Use at least {MIN_PASSWORD_LENGTH} characters.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 transition"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
