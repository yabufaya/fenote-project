// Supabase Auth connectivity + getClaims() verification test.
// Run: cd admin-app/backend && node scripts/test-auth.mjs
// Optional env (do NOT store a password in a file):
//   TEST_EMAIL / TEST_PASSWORD   -> signInWithPassword + getClaims
//   TEST_SUPABASE_TOKEN          -> verify an existing access token
//   TEST_ADMIN_API_URL           -> also call a running admin API with the token
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });
const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY in repo-root .env.local or admin-app/backend/.env');
if (key.startsWith('sb_secret_')) throw new Error('Refusing to run with a secret key');

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket }, // Node 20 has no native WebSocket
});

async function main() {
  console.log('Project:', url);

  // 1. JWKS endpoint reachable (asymmetric signing key).
  const jwksRes = await fetch(`${url}/auth/v1/.well-known/jwks.json`, { headers: { apikey: key } });
  if (!jwksRes.ok) throw new Error(`JWKS HTTP ${jwksRes.status}`);
  const jwks = await jwksRes.json();
  console.log('PASS: JWKS reachable, kids =', jwks.keys.map((k) => k.kid).join(', '));

  // 2. Invalid token is rejected without trusting getSession().
  const invalid = await supabase.auth.getClaims('not-a-jwt');
  if (!invalid.error) throw new Error('FAIL: invalid JWT unexpectedly verified');
  console.log('PASS: invalid token rejected ->', invalid.error.message);

  // 3. Live token: either supply one, or sign in with a real Auth user.
  let token = process.env.TEST_SUPABASE_TOKEN || '';
  if (!token && process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD,
    });
    if (error) throw error;
    token = data.session.access_token;
    console.log('PASS: signInWithPassword for', data.user.email);
  }

  if (token) {
    const { data, error } = await supabase.auth.getClaims(token);
    if (error) throw error;
    const c = data.claims;
    console.log('PASS: getClaims verified ->', { sub: c.sub, role: c.role, email: c.email, iss: c.iss });
    if (c.role !== 'authenticated' || !c.sub) throw new Error('FAIL: token is not an authenticated user');

    if (process.env.TEST_ADMIN_API_URL) {
      const res = await fetch(`${process.env.TEST_ADMIN_API_URL.replace(/\/$/, '')}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Admin API /dashboard/stats -> HTTP ${res.status}`);
      if (res.status !== 200) console.log('(Check the admin_profiles allowlist, confirmed email and that the API is running)');
    }
    await supabase.auth.signOut().catch(() => {});
  } else {
    console.log('SKIP live login. Set TEST_EMAIL + TEST_PASSWORD (or TEST_SUPABASE_TOKEN) in your shell.');
    console.log('Seed the superadmin email in admin_profiles and activate at /activate first; there is no default password.');
  }
}

main().catch((err) => {
  console.error('AUTH TEST FAILED:', err.message || err);
  process.exitCode = 1;
});
