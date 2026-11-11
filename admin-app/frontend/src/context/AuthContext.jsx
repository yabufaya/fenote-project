import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api, { setAdminAccessToken } from '../services/api';
import { adminPath } from '../lib/basePath';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const SESSION_TIMEOUT_MS = 8000;
const PROFILE_TIMEOUT_MS = 8000;

const withTimeout = (promise, ms, label) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const syncIdRef = useRef(0);

  const refreshAdminProfile = useCallback(async () => {
    try {
      const res = await api.get('/admins/me', { timeout: PROFILE_TIMEOUT_MS });
      const profile = res.data.data || null;
      setAdminProfile(profile);
      return profile;
    } catch (err) {
      setAdminProfile(null);
      setAuthError(
        err?.response?.data?.message ||
        err?.message ||
        'Could not load the admin profile.'
      );
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async (session) => {
      const syncId = ++syncIdRef.current;
      if (!active) return;
      setUser(session?.user ?? null);
      setAdminAccessToken(session?.access_token ?? null);
      setAuthError('');
      try {
        if (session?.access_token) await refreshAdminProfile();
        else setAdminProfile(null);
      } catch (err) {
        if (active && syncId === syncIdRef.current) {
          setAuthError(err?.message || 'Could not verify the admin session.');
          setAdminProfile(null);
        }
      } finally {
        if (active && syncId === syncIdRef.current) setLoading(false);
      }
    };

    // Resolve the initial session outside the auth listener. Awaiting other
    // Supabase auth methods inside onAuthStateChange can deadlock the client,
    // so listener callbacks are deferred to the next tick.
    withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, 'Supabase session lookup')
      .then((result) => {
        if (result.error) throw result.error;
        return sync(result.data?.session ?? null);
      })
      .catch((err) => {
        if (!active) return;
        setAuthError(err?.message || 'Could not read the Supabase session.');
        setAdminAccessToken(null);
        setAdminProfile(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (active) sync(session);
      }, 0);
    });

    // Absolute guard: never leave the whole admin app on an infinite spinner,
    // even if a network request or auth callback never settles.
    const safetyTimer = setTimeout(() => {
      if (!active) return;
      setLoading(false);
      setAuthError((prev) => prev || 'Admin session check timed out. Try signing in again.');
    }, SESSION_TIMEOUT_MS + 2000);

    return () => {
      active = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [refreshAdminProfile]);

  const login = async (email, password) => {
    // Clear any stale local Supabase session (for example an old invite or
    // Google session) before password sign-in, then trim accidental spaces.
    await supabase.auth.signOut().catch(() => {});
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim(),
      password,
    });
    if (error) throw error;
    setUser(data.user);
    setAdminAccessToken(data.session?.access_token ?? null);
    setAuthError('');
    const profile = await refreshAdminProfile();
    if (!profile) throw new Error('This account does not have an active admin profile.');
    return data;
  };

  const signInWithGoogle = async (redirectTo = `${window.location.origin}${adminPath('/')}`) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setAdminAccessToken(null);
    setUser(null);
    setAdminProfile(null);
    setAuthError('');
  };

  const value = {
    user, adminProfile, loading, authError, login, signInWithGoogle, logout, refreshAdminProfile,
    isAuthenticated: !!user && !!adminProfile,
    isSuperadmin: adminProfile?.role === 'superadmin',
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
