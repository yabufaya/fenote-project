import { createClient } from '@supabase/supabase-js';

// Publishable key only — this SPA stays anonymous and never signs in.
// The Realtime client needs a WebSocket constructor. Some sandboxed preview
// iframes have no WebSocket at all; in that case we skip the client entirely
// and usePublicRealtime falls back to polling/tab-focus. This prevents the
// whole React tree from white-screening at module load.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const webSocketAvailable =
  typeof globalThis !== 'undefined' && typeof globalThis.WebSocket === 'function';

if (publishableKey?.startsWith('sb_secret_')) {
  throw new Error('Refusing to start: a secret key was supplied to the public browser bundle');
}
if (!supabaseUrl || !publishableKey) {
  console.warn('Public Realtime disabled: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

let client = null;
if (supabaseUrl && publishableKey && webSocketAvailable) {
  try {
    client = createClient(supabaseUrl, publishableKey, {
      // The public SPA has no Supabase Auth session. Without this callback,
      // supabase-js sends the publishable key as the Realtime `access_token`.
      // A publishable key is an opaque API key, not a JWT, so Realtime can
      // reject the channel and the site falls back to slow polling. An empty
      // token keeps the public channel on `apikey` only.
      accessToken: async () => '',
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        transport: globalThis.WebSocket,
        params: { eventsPerSecond: 10 },
      },
    });
  } catch (err) {
    console.warn('Public Realtime disabled: Supabase client could not start.', err);
  }
} else if (supabaseUrl && publishableKey && !webSocketAvailable) {
  console.warn('Public Realtime disabled: WebSocket unavailable in this preview; polling fallback active.');
}

export const supabase = client;
export const publicRealtimeEnabled = Boolean(client);
