import { useState } from 'react';
import { adminPath } from '../lib/basePath';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Brain, Shield, Sparkles, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(String(email).trim(), {
        redirectTo: `${window.location.origin}${adminPath('/reset-password')}`,
      });
      if (error) throw error;
      alert('Password reset link sent to your email!');
      setShowForgotPassword(false);
    } catch (err) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary-500/5 to-violet-500/5 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      <div className="w-full max-w-md relative animate-scale-in">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 shadow-2xl shadow-primary-500/30 mb-6 animate-pulse-glow">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Fenote Admin</h1>
          <p className="text-gray-400">Psychiatry Management Panel</p>
        </div>

        {/* Decorative Features */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {[
            { icon: Shield, text: 'Secure', delay: '0s' },
            { icon: Lock, text: 'Private', delay: '0.1s' },
            { icon: Sparkles, text: 'Smart', delay: '0.2s' },
          ].map((feat, i) => (
            <div 
              key={feat.text}
              className="flex items-center gap-2 text-gray-500 animate-fade-in"
              style={{ animationDelay: feat.delay }}
            >
              <feat.icon className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-medium">{feat.text}</span>
            </div>
          ))}
        </div>

        {/* Form Card */}
        {!showForgotPassword ? (
          <div className="relative animate-slide-up">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-violet-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              {/* Card Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-1">Welcome Back</h2>
                <p className="text-gray-400 text-sm">Sign in to access your dashboard</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-scale-in">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-violet-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 
                          focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 focus:bg-white/10 transition-all duration-200"
                        placeholder="admin@fenote.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-violet-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 focus:bg-white/10 transition-all duration-200"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-300 transition"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3 px-4 rounded-xl font-medium 
                    hover:from-primary-700 hover:to-primary-600 focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed 
                    flex items-center justify-center gap-2 group shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] text-gray-500 font-medium">OR</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:text-white transition disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
                  </svg>
                  Continue with Google
                </button>
                <p className="text-[11px] text-gray-500 text-center -mt-1">
                  Google is available only for an admin email that already exists in Supabase Auth
                  and is active in the admin allowlist. It does not create a new account.
                </p>
              </form>

              <div className="mt-6 flex flex-col items-center gap-3 text-center">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-gray-400 hover:text-primary-400 text-sm font-medium transition-colors"
                >
                  Forgot Password?
                </button>
                <div className="h-px w-full bg-white/10" />
                <p className="text-xs text-gray-500">
                  Have an invitation?{' '}
                  <Link to="/activate" className="inline-flex items-center gap-1 font-semibold text-primary-300 hover:text-white transition-colors">
                    <UserPlus className="w-3.5 h-3.5" /> Set your password
                  </Link>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Forgot Password Form */
          <div className="relative animate-scale-in">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-violet-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-semibold text-white mb-1">Reset Password</h2>
              <p className="text-gray-400 text-sm mb-8">Enter your email to receive a reset link</p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-scale-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors w-5 h-5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 
                          focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 focus:bg-white/10 transition-all duration-200"
                        placeholder="admin@fenote.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3 px-4 rounded-xl font-medium 
                    hover:from-primary-700 hover:to-primary-600 transition-all duration-200 disabled:opacity-50 
                    flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-gray-400 hover:text-primary-400 text-sm font-medium transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No demo credentials: admin users are created in Supabase Auth. */}
      </div>
    </div>
  );
}