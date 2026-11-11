import { createClient } from '@supabase/supabase-js';

// Publishable key is safe in the browser. NEVER put sb_secret_* / service_role here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}
if (publishableKey.startsWith('sb_secret_')) {
  throw new Error('Refusing to start: a secret key was supplied to the browser bundle');
}

// Supabase's createClient() always constructs a Realtime client, which throws
// when the runtime has no WebSocket constructor. Some sandboxed preview iframes
// have no WebSocket at all. A closed no-op transport satisfies the SDK so Auth
// and the admin UI still render; Realtime simply stays disconnected there.
class NoopWebSocket {
  constructor(url, protocols) {
    this.url = url;
    this.protocols = protocols;
    this.readyState = 3; // CLOSED
    this.binaryType = 'arraybuffer';
  }
  send() {}
  close() {
    this.readyState = 3;
    if (typeof this.onclose === 'function') {
      this.onclose({ code: 1000, reason: 'WebSocket unavailable', wasClean: true });
    }
  }
}

const WsTransport =
  typeof globalThis !== 'undefined' && typeof globalThis.WebSocket === 'function'
    ? globalThis.WebSocket
    : NoopWebSocket;

export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    transport: WsTransport,
    params: { eventsPerSecond: 10 },
  },
});

// Supabase Admin inviteUserByEmail() uses an implicit/hash invite link, not the
// PKCE code flow used by normal browser sign-in. This isolated client is used
// only on /activate to exchange invitation tokens and set the first password.
// It never persists the invitation session to browser storage.
export const inviteSupabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
  realtime: {
    transport: WsTransport,
    params: { eventsPerSecond: 10 },
  },
});
