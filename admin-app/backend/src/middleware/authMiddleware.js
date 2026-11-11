const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const pool = require('../db');

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY');
}
if (publishableKey.startsWith('sb_secret_')) {
  throw new Error('Refusing to start: SUPABASE_PUBLISHABLE_KEY contains a secret key');
}

// Server-side client used ONLY to verify the browser's access token against the
// Supabase JWKS endpoint. The publishable key is not a Bearer token and is not
// a secret. `ws` is required because Node 20 has no native WebSocket.
const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});

async function verifyClaims(token) {
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  const claims = data.claims;
  if (claims.role !== 'authenticated' || !claims.sub) return null;
  const expectedIss = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  if (claims.iss && claims.iss !== expectedIss) return null;
  return claims;
}

// Resolve the DB-backed admin profile. On first confirmed login this links a
// pre-provisioned email row (created by the superadmin) to auth.users.id.
async function resolveAdminProfile(claims) {
  const { rows } = await pool.query(
    'select * from public.link_admin_profile($1::uuid, $2::text)',
    [claims.sub, claims.email || '']
  );
  return rows[0] || null;
}

function attachAuth(req, claims, profile) {
  req.auth = {
    userId: claims.sub,
    email: claims.email || null,
    role: profile.role,
    profileId: profile.id,
    claims,
  };
}

module.exports = { supabase, verifyClaims, resolveAdminProfile, attachAuth };

async function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: 'Missing bearer token' });

  try {
    const claims = await verifyClaims(match[1]);
    if (!claims) return res.status(401).json({ message: 'Invalid or expired token' });
    const profile = await resolveAdminProfile(claims);
    if (!profile || !profile.is_active) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    attachAuth(req, claims, profile);
    return next();
  } catch (err) {
    console.error('Admin token verification failed:', err.message);
    return res.status(401).json({ message: 'Token verification failed' });
  }
}

function requireSuperadmin(req, res, next) {
  if (req.auth?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Superadmin access required' });
  }
  return next();
}

// EventSource cannot set an Authorization header. Accept the short-lived token
// only on the dedicated SSE route; regular CRUD endpoints remain Bearer-only.
async function authenticateEventSourceToken(req, res, next) {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (!token) return res.status(401).json({ message: 'Missing access token' });
  try {
    const claims = await verifyClaims(token);
    if (!claims) return res.status(401).json({ message: 'Invalid or expired token' });
    const profile = await resolveAdminProfile(claims);
    if (!profile || !profile.is_active) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    attachAuth(req, claims, profile);
    return next();
  } catch (err) {
    console.error('Admin stream token verification failed:', err.message);
    return res.status(401).json({ message: 'Token verification failed' });
  }
}

module.exports.authenticateToken = authenticateToken;
module.exports.requireSuperadmin = requireSuperadmin;
module.exports.authenticateEventSourceToken = authenticateEventSourceToken;
