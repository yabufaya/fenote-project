const pool = require('../db');
const {
  getSupabaseAdmin,
  isExistingUserError,
  inviteFailureMessage,
  logInviteError,
} = require('../utils/supabaseAdmin');

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function activationOrigin(req) {
  const clean = (s) => String(s || '').trim().replace(/\/+$/, '');
  const configured = clean(process.env.ADMIN_APP_ORIGIN || process.env.ADMIN_URL);
  const origin = clean(req.headers.origin);
  const allowlist = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(clean)
    .filter(Boolean);
  const local = ['http://localhost:5174', 'http://localhost:5173'];
  const candidates = [...allowlist, configured, ...local].filter(Boolean);
  if (origin && candidates.includes(origin)) return origin;
  return configured || 'http://localhost:5174';
}

// Local admin SPA is at the origin root; the one-app Cloudflare build is at
// /admin. Keep invitation links pointing at whichever base is configured.
function adminBasePath() {
  const raw = String(process.env.ADMIN_APP_BASE_PATH || '').trim();
  const normalized = raw.replace(/^\/+|\/+$/g, '');
  return normalized ? `/${normalized}` : '';
}

function inviteRedirect(req) {
  return `${activationOrigin(req)}${adminBasePath()}/activate`;
}

async function sendInvite(email, req) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirect(req),
  });
  if (!error) return { existingAccount: false };
  logInviteError('Supabase invite error', error);
  if (isExistingUserError(error)) return { existingAccount: true };
  throw error;
}

async function rollbackProfile(id) {
  await pool.query('delete from public.admin_profiles where id = $1', [id]);
}

exports.getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.auth.profileId,
      userId: req.auth.userId,
      email: req.auth.email,
      role: req.auth.role,
    },
  });
};

exports.list = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `select id, email, role, is_active, auth_user_id, linked_at,
              invited_by, created_at, updated_at
       from public.admin_profiles order by created_at asc, id asc`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List admin profiles error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Superadmin-only. Inserts the allowlist row first, then asks Supabase Auth to
// send an invite ONLY to that exact address. If the Auth invite fails, the new
// row is removed so no half-created admin remains.
exports.create = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }
  try {
    const { rows } = await pool.query(
      `insert into public.admin_profiles (email, role, is_active, invited_by)
       values ($1, 'admin', true, $2)
       on conflict (email) do nothing
       returning id, email, role, is_active, created_at`,
      [email, req.auth.profileId]
    );
    if (!rows.length) {
      return res.status(409).json({ success: false, message: 'That email is already registered' });
    }

    try {
      const invite = await sendInvite(email, req);
      return res.status(201).json({
        success: true,
        data: rows[0],
        inviteStatus: invite.existingAccount ? 'existing-account' : 'sent',
        message: invite.existingAccount
          ? 'Email already has a Supabase account. It is now on the active admin allowlist.'
          : 'Admin email added and invitation sent.',
      });
    } catch (error) {
      await rollbackProfile(rows[0].id);
      logInviteError('Admin invitation error', error);
      return res.status(503).json({
        success: false,
        message: inviteFailureMessage(error),
      });
    }
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, message: 'That email is already registered' });
    }
    console.error('Create admin profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  try {
    const current = await pool.query('select * from public.admin_profiles where id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (current.rows[0].role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'The superadmin row cannot be modified' });
    }
    const active = typeof req.body.is_active === 'boolean'
      ? req.body.is_active
      : current.rows[0].is_active;
    // Never allow promoting another row to superadmin: exactly one exists.
    const { rows } = await pool.query(
      `update public.admin_profiles
       set is_active = $1, role = 'admin', updated_at = now()
       where id = $2
       returning id, email, role, is_active, updated_at`,
      [active, id]
    );
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Update admin profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  try {
    const current = await pool.query('select * from public.admin_profiles where id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (current.rows[0].role === 'superadmin' || id === req.auth.profileId) {
      return res.status(403).json({ success: false, message: 'Cannot remove the superadmin or your own row' });
    }
    await pool.query('delete from public.admin_profiles where id = $1', [id]);
    return res.json({ success: true, message: 'Admin access revoked' });
  } catch (error) {
    console.error('Delete admin profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Superadmin-only resend. Still checks the active allowlist row before any
// Supabase email is sent. Existing confirmed accounts are not re-invited.
exports.resendInvite = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
  try {
    const { rows } = await pool.query(
      `select id, email, is_active, role from public.admin_profiles
       where id = $1 and is_active = true`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Active admin profile not found' });
    }
    const invite = await sendInvite(rows[0].email, req);
    return res.json({
      success: true,
      inviteStatus: invite.existingAccount ? 'existing-account' : 'sent',
      message: invite.existingAccount
        ? 'That Supabase account already exists; no new invitation email was needed.'
        : 'Invitation sent.',
    });
  } catch (error) {
    logInviteError('Resend admin invitation error', error);
    return res.status(503).json({
      success: false,
      message: inviteFailureMessage(error),
    });
  }
};
