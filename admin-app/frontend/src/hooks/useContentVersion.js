import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

// A successful database UPDATE does not change a browser's in-memory React
// state. Three invalidation paths are used: server-side Supabase Realtime
// Broadcast for near-instant cross-device updates, Supabase Postgres Changes
// where available, and a deterministic PII-free version poll for browsers
// whose WebSocket is blocked or disconnected.
const POLL_MS = 5000;
const LEASE_MS = 9000;
const HEARTBEAT_MS = 2000;
const CHANNEL_NAME = 'fenote-content-version';
const LEASE_KEY = 'fenote-content-version-leader';
const MESSAGE_KEY = 'fenote-content-version-message';
const EVENT_NAME = 'fenote:content-change';
const REALTIME_TOPIC = 'fenote-content';
const REALTIME_EVENT = 'content-change';

function safeGet(key) {
  try { return window.localStorage.getItem(key); } catch (_) { return null; }
}
function safeSet(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
}
function safeRemove(key) {
  try { window.localStorage.removeItem(key); } catch (_) { /* storage unavailable */ }
}
function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function parseLease(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

// Called immediately after a trusted admin save. Other tabs on the same origin
// refresh without waiting for the next version poll.
export function publishContentChange(table) {
  if (typeof window === 'undefined') return;
  const names = (Array.isArray(table) ? table : [table]).filter(Boolean);
  const stamp = makeId();
  const payload = {
    version: `local-${stamp}`,
    tables: Object.fromEntries(names.map((name) => [name, stamp])),
  };
  const message = { type: 'content-change', payload, force: true, id: stamp };
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(message);
      channel.close();
    }
  } catch (_) { /* channel unavailable */ }
  // Also cover browsers/tabs without BroadcastChannel.
  safeSet(MESSAGE_KEY, JSON.stringify(message));
}

export function useContentVersion({ enabled = true, pollMs = POLL_MS } = {}) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    const apiBase = String(import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
    const endpoint = `${apiBase}/content-version`;
    const intervalMs = Math.max(2000, Number(pollMs) || POLL_MS);
    const tabId = makeId();
    const seenIds = new Set();

    let stopped = false;
    let inFlight = false;
    let isLeader = false;
    let lastVersion = null;
    let lastTables = null;
    let pollTimer = null;
    let heartbeatTimer = null;
    let channel = null;
    let realtimeChannel = null;
    let suppressVersionUntil = 0;

    const dispatchLocal = (detail) => {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    };

    const rememberId = (id) => {
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      if (seenIds.size > 100) seenIds.delete(seenIds.values().next().value);
      return true;
    };

    const sendMessage = (message) => {
      const withId = { ...message, id: message.id || makeId() };
      rememberId(withId.id);
      if (channel) {
        try { channel.postMessage(withId); } catch (_) { /* channel closed */ }
      }
      safeSet(MESSAGE_KEY, JSON.stringify(withId));
    };

    const applyPayload = (payload, { broadcast = false, force = false } = {}) => {
      const version = typeof payload?.version === 'string' ? payload.version : null;
      const tables = payload?.tables && typeof payload.tables === 'object' && !Array.isArray(payload.tables)
        ? payload.tables
        : {};
      if (!version) return;

      const previousVersion = lastVersion;
      const previousTables = lastTables || {};
      const changed = Object.keys(tables).filter((name) => previousTables[name] !== tables[name]);
      const firstSeen = previousVersion === null;
      lastVersion = version;
      lastTables = { ...tables };

      // A just-received Realtime Broadcast already triggered the refetch.
      // Absorb the matching version poll silently to avoid duplicate GETs.
      if (!force && (
        firstSeen ||
        previousVersion === version ||
        Date.now() < suppressVersionUntil
      )) return;
      const targets = changed.length ? changed : Object.keys(tables);
      dispatchLocal({ version, tables: targets, force });
      if (broadcast) {
        sendMessage({ type: 'content-change', payload, force: false });
      }
    };

    const checkNow = async ({ broadcast = false } = {}) => {
      if (stopped || inFlight || document.hidden) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      inFlight = true;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller ? controller.signal : undefined,
        });
        if (!response.ok) return;
        const payload = await response.json();
        applyPayload(payload, { broadcast });
      } catch (_) {
        // Realtime and the 45s section fallback remain active.
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        inFlight = false;
      }
    };

    const readLease = () => parseLease(safeGet(LEASE_KEY));
    const writeLease = (ts) => safeSet(LEASE_KEY, JSON.stringify({ tabId, ts }));

    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };
    const startPolling = () => {
      stopPolling();
      pollTimer = setInterval(() => {
        if (isLeader && !document.hidden) checkNow({ broadcast: true });
      }, intervalMs);
    };

    const claimLeadership = () => {
      // A hidden tab must never hold or renew the shared leader lease.
      // Otherwise every visible tab is blocked from the 5s version poll.
      if (stopped || document.hidden) return;
      const now = Date.now();
      const lease = readLease();
      const available = !lease || !lease.ts || now - Number(lease.ts) > LEASE_MS || lease.tabId === tabId;
      if (available) {
        writeLease(now);
        if (!isLeader) {
          isLeader = true;
          startPolling();
          checkNow({ broadcast: true });
        }
      } else if (isLeader) {
        isLeader = false;
        stopPolling();
      }
    };

    const releaseLeadership = () => {
      if (!isLeader) return;
      isLeader = false;
      stopPolling();
      const lease = readLease();
      if (lease?.tabId === tabId) safeRemove(LEASE_KEY);
      sendMessage({ type: 'leader-release' });
    };

    const handleMessage = (message) => {
      if (!message || typeof message !== 'object') return;
      if (message.id && !rememberId(message.id)) return;
      if (message.type === 'content-change') {
        const realtimeId = message.payload?.message_id;
        if (realtimeId && !rememberId(`realtime-${realtimeId}`)) return;
        if (message.force) suppressVersionUntil = Date.now() + 2500;
        applyPayload(message.payload, { force: Boolean(message.force) });
      } else if (message.type === 'leader-release') {
        claimLeadership();
      }
    };

    const handleRealtimeMessage = (message) => {
      const payload = message?.payload || {};
      const realtimeId = String(payload.message_id || '');
      if (realtimeId && !rememberId(`realtime-${realtimeId}`)) return;
      const names = Array.isArray(payload.tables)
        ? payload.tables.filter(Boolean)
        : [];
      const version = String(payload.version || `realtime-${makeId()}`);
      suppressVersionUntil = Date.now() + 2500;
      dispatchLocal({ version, tables: names, force: true, source: 'realtime' });
      // Relay to same-origin tabs that cannot hold a WebSocket connection.
      sendMessage({
        type: 'content-change',
        force: true,
        id: `relay-${realtimeId || makeId()}`,
        payload: {
          message_id: realtimeId || makeId(),
          version,
          tables: Object.fromEntries(names.map((name) => [name, version])),
        },
      });
    };

    if (supabase && typeof supabase.channel === 'function') {
      try {
        realtimeChannel = supabase.channel(REALTIME_TOPIC, {
          config: { broadcast: { self: false }, private: false },
        });
        realtimeChannel.on('broadcast', { event: REALTIME_EVENT }, handleRealtimeMessage);
        realtimeChannel.subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            // Version polling and per-section fallbacks remain active.
          }
        });
      } catch (_) {
        realtimeChannel = null;
      }
    }

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (event) => handleMessage(event.data);
      } catch (_) {
        channel = null;
      }
    }

    const storageHandler = (event) => {
      if (event.key !== MESSAGE_KEY || !event.newValue) return;
      try { handleMessage(JSON.parse(event.newValue)); } catch (_) { /* malformed */ }
    };
    const visibilityHandler = () => {
      if (document.hidden) {
        releaseLeadership();
        return;
      }
      claimLeadership();
      checkNow({ broadcast: isLeader });
    };
    const focusHandler = () => {
      claimLeadership();
      checkNow({ broadcast: isLeader });
    };
    const onlineHandler = () => {
      claimLeadership();
      checkNow({ broadcast: isLeader });
    };
    const pageHideHandler = () => releaseLeadership();

    window.addEventListener('storage', storageHandler);
    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('focus', focusHandler);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('pagehide', pageHideHandler);

    claimLeadership();
    checkNow({ broadcast: isLeader });
    heartbeatTimer = setInterval(claimLeadership, HEARTBEAT_MS);

    return () => {
      stopped = true;
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      window.removeEventListener('storage', storageHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('pagehide', pageHideHandler);
      releaseLeadership();
      if (realtimeChannel && supabase) {
        try { supabase.removeChannel(realtimeChannel); } catch (_) { /* already closed */ }
      }
      if (channel) {
        try { channel.close(); } catch (_) { /* already closed */ }
      }
    };
  }, [enabled, pollMs]);
}

export default useContentVersion;
