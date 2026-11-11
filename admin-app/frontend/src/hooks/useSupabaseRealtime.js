import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Unique topics avoid the "cannot add callbacks after subscribe()" race when
// several components (or React StrictMode's double effect) use the same table.
let channelSequence = 0;

// Supabase Realtime is the fast path. A shared polling/tab-focus fallback and
// the PII-free content-version event keep admin sections fresh when WebSockets
// are blocked, disconnected, or an event is missed.
const fallback = {
  subscribers: new Map(),
  timeouts: new Set(),
  interval: null,
  intervalMs: 0,
  focusHandler: null,
  visibilityHandler: null,
};
let fallbackSequence = 0;

function broadcast() {
  const list = Array.from(fallback.subscribers.values());
  list.forEach(({ notify }, index) => {
    const timer = setTimeout(() => {
      fallback.timeouts.delete(timer);
      try { notify(); } catch (_) { /* component unmounted */ }
    }, index * 75);
    fallback.timeouts.add(timer);
  });
}

function minFallbackMs() {
  let min = Infinity;
  fallback.subscribers.forEach(({ ms }) => {
    if (ms < min) min = ms;
  });
  return Number.isFinite(min) ? min : 30000;
}

function ensureFallback() {
  const ms = minFallbackMs();
  if (!fallback.interval || fallback.intervalMs !== ms) {
    if (fallback.interval) clearInterval(fallback.interval);
    fallback.intervalMs = ms;
    fallback.interval = setInterval(broadcast, ms);
  }
  if (!fallback.focusHandler) {
    fallback.focusHandler = () => broadcast();
    fallback.visibilityHandler = () => {
      if (document.visibilityState === 'visible') broadcast();
    };
    window.addEventListener('focus', fallback.focusHandler);
    document.addEventListener('visibilitychange', fallback.visibilityHandler);
  }
}

function stopFallbackIfIdle() {
  if (fallback.subscribers.size > 0) return;
  if (fallback.interval) clearInterval(fallback.interval);
  fallback.interval = null;
  fallback.intervalMs = 0;
  fallback.timeouts.forEach((timer) => clearTimeout(timer));
  fallback.timeouts.clear();
  if (fallback.focusHandler) window.removeEventListener('focus', fallback.focusHandler);
  if (fallback.visibilityHandler) {
    document.removeEventListener('visibilitychange', fallback.visibilityHandler);
  }
  fallback.focusHandler = null;
  fallback.visibilityHandler = null;
}

// Subscribe to Supabase Realtime postgres_changes for the given public tables.
// onChange receives the changed table name; callers refetch their own data.
// The existing Express SSE stream remains the fallback for the notification bell.
export function useSupabaseRealtime(tables, onChange, fallbackMs = 30000) {
  const key = Array.isArray(tables) ? tables.join(',') : '';
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!key || typeof onChange !== 'function') return undefined;
    let debounceTimer = null;
    let channel = null;
    const subscriberId = ++fallbackSequence;

    const fire = (table) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => onChangeRef.current(table), 150);
    };

    const contentChangeHandler = (event) => {
      const changed = event?.detail?.tables;
      const watched = key.split(',');
      if (!Array.isArray(changed) || changed.length === 0 || changed.some((table) => watched.includes(table))) {
        fire(key);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('fenote:content-change', contentChangeHandler);
    }

    fallback.subscribers.set(subscriberId, {
      ms: fallbackMs,
      notify: () => onChangeRef.current(key),
    });
    ensureFallback();

    channelSequence += 1;
    const channelName = `admin-live-${key.replace(/,/g, '-')}-${channelSequence}`;
    try {
      channel = supabase.channel(channelName);
      key.split(',').forEach((table) => {
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => fire(table)
        );
      });
      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn(`Supabase Realtime unavailable for ${key}; version poll and polling fallback stay active`);
        }
      });
    } catch (err) {
      console.warn(`Supabase Realtime setup failed for ${key}; version poll and polling fallback stay active`, err);
      if (channel && supabase) {
        try { supabase.removeChannel(channel); } catch (_) { /* already closed */ }
        channel = null;
      }
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('fenote:content-change', contentChangeHandler);
      }
      fallback.subscribers.delete(subscriberId);
      if (fallback.subscribers.size === 0) stopFallbackIfIdle();
      else ensureFallback();
      if (channel && supabase) {
        try { supabase.removeChannel(channel); } catch (_) { /* already closed */ }
      }
    };
  }, [key, fallbackMs]);
}
