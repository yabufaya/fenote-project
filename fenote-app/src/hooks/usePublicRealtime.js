import { useEffect, useRef } from 'react';
import { supabase, publicRealtimeEnabled } from '../lib/supabase';

// Every hook instance gets its own channel topic. Reusing one topic (for
// example `contact` in Contact, Footer and PaymentOverlay) makes Supabase
// return the same channel object; one component can then call subscribe()
// before another has finished registering .on() callbacks, which crashes React.
let channelSequence = 0;

// One shared fallback ticker for all mounted sections. Thirteen independent
// 45s timers plus per-hook focus/visibility listeners used to fire a burst of
// GETs and exhaust the public API rate limiter (429). Subscribers are now
// staggered by 75ms and share a single interval + focus/visibility listeners.
const fallback = {
  subscribers: new Map(),
  timeouts: new Set(),
  interval: null,
  intervalMs: 0,
  focusHandler: null,
  visibilityHandler: null,
};
let fallbackSequence = 0;
const warnedKeys = new Set();

function warnOnce(key, message) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

function broadcast() {
  const list = Array.from(fallback.subscribers.values());
  list.forEach(({ notify }, index) => {
    const timer = setTimeout(() => {
      fallback.timeouts.delete(timer);
      try {
        notify();
      } catch (_) {
        /* component unmounted between scheduling and firing */
      }
    }, index * 75);
    fallback.timeouts.add(timer);
  });
}

function minFallbackMs() {
  let min = Infinity;
  fallback.subscribers.forEach(({ ms }) => {
    if (ms < min) min = ms;
  });
  return Number.isFinite(min) ? min : 45000;
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

// Refetch a public section when its Postgres table changes. The callback is
// kept in a ref so an inline parent function never re-subscribes the channel.
// A shared polling + tab-focus fallback also covers anonymous DELETE events,
// no-WebSocket previews and temporary Realtime disconnects.
export function usePublicRealtime(tables, onChange, fallbackMs = 45000) {
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

    // Static UI labels change instantly with i18next; database-backed text must
    // be refetched with the new ?lang=... value. One debounced refresh per hook
    // keeps the language swap responsive without a burst of requests.
    const languageHandler = (event) => {
      fire(`language:${event?.detail?.language || 'en'}`);
    };
    // The version poller and a successful admin save broadcast this event.
    // Refetch only sections whose table stamp changed, or all sections when
    // the event has no specific table list.
    const contentChangeHandler = (event) => {
      const changed = event?.detail?.tables;
      const watched = key.split(',');
      if (!Array.isArray(changed) || changed.length === 0 || changed.some((table) => watched.includes(table))) {
        fire(key);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('fenote:languagechange', languageHandler);
      window.addEventListener('fenote:content-change', contentChangeHandler);
    }

    fallback.subscribers.set(subscriberId, {
      ms: fallbackMs,
      notify: () => onChangeRef.current(key),
    });
    ensureFallback();

    if (publicRealtimeEnabled) {
      channelSequence += 1;
      const channelName = `public-live-${key.replace(/,/g, '-')}-${channelSequence}`;
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
            warnOnce(
              `realtime-${key}-${status}`,
              `Supabase Realtime unavailable for ${key}; polling fallback stays active`
            );
          }
        });
      } catch (err) {
        warnOnce(
          `realtime-setup-${key}`,
          `Supabase Realtime setup failed for ${key}; polling fallback stays active`
        );
        console.warn(err);
        if (channel && supabase) {
          try { supabase.removeChannel(channel); } catch (_) { /* already closed */ }
          channel = null;
        }
      }
    } else {
      warnOnce(
        `realtime-disabled-${key}`,
        `Supabase Realtime not configured for ${key}; polling fallback active`
      );
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('fenote:languagechange', languageHandler);
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
