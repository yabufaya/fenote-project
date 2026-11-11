import { useEffect, useRef } from 'react';

// One authenticated SSE connection in App.jsx dispatches `fenote:admin-event`.
// Pages subscribe to that custom event instead of opening their own EventSource
// or subscribing to private Supabase Realtime tables.
export function useAdminLiveRefresh(onEvent) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const handler = (event) => {
      try { handlerRef.current(event?.detail || null); } catch (err) { console.warn('Admin live refresh failed:', err); }
    };
    window.addEventListener('fenote:admin-event', handler);
    return () => window.removeEventListener('fenote:admin-event', handler);
  }, []);
}
