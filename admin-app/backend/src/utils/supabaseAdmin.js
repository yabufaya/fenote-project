// Server-only Supabase Auth Admin client for invitation emails.
//
// This client must never be created in the browser, in a VITE_* variable, or
// in wrangler.jsonc [vars]. It is created lazily inside an authenticated
// request handler so Workers never hold a global I/O client.
const { createClient } = require('@supabase/supabase-js');

function markedError(message, inviteKind) {
  const error = new Error(message);
  error.inviteKind = inviteKind;
  return error;
}

function getSupabaseAdmin() {
  const url = String(process.env.SUPABASE_URL || '').trim();
  const secretKey = String(process.env.SUPABASE_SECRET_KEY || '').trim();

  if (!url || !secretKey) {
    throw markedError(
      'SUPABASE_SECRET_KEY is not available to the Worker',
      'missing',
    );
  }
  if (secretKey.startsWith('sb_publishable_') || secretKey.startsWith('VITE_')) {
    throw markedError(
      'Refusing to use a browser/publishable key for admin invites',
      'secret',
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function isExistingUserError(error) {
  const code = String(error?.code || '').toLowerCase();
  const text = String(error?.message || '').toLowerCase();
  const status = Number(error?.status || 0);
  return (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    (status === 422 && (text.includes('already') || text.includes('exists'))) ||
    text.includes('already registered') ||
    text.includes('already been registered') ||
    text.includes('already exists') ||
    text.includes('user already') ||
    text.includes('email address is already') ||
    text.includes('already in use')
  );
}

function inviteErrorKind(error) {
  if (error?.inviteKind) return error.inviteKind;
  if (isExistingUserError(error)) return 'existing';
  const status = Number(error?.status || 0);
  const text = String(error?.message || '').toLowerCase();
  if (
    status === 401 || status === 403 ||
    text.includes('invalid api key') ||
    text.includes('invalid jwt') ||
    text.includes('not_admin') ||
    text.includes('no_authorization') ||
    text.includes('unauthorized')
  ) return 'secret';
  if (
    text.includes('redirect') ||
    text.includes('redirect_to') ||
    text.includes('not allowed') ||
    text.includes('allowlist') ||
    text.includes('site url')
  ) return 'redirect';
  if (
    text.includes('error sending invite') ||
    text.includes('smtp') ||
    text.includes('mailer') ||
    text.includes('rate limit') ||
    text.includes('too many emails')
  ) return 'email';
  if (
    text.includes('fetch failed') ||
    text.includes('network') ||
    text.includes('timeout') ||
    text.includes('enotfound') ||
    text.includes('econn')
  ) return 'network';
  return 'unknown';
}

function inviteFailureMessage(error) {
  switch (inviteErrorKind(error)) {
    case 'existing':
      return 'That Supabase account already exists; no new invitation email was needed.';
    case 'missing':
      return 'SUPABASE_SECRET_KEY is not available to the Worker. Add it as a Cloudflare Worker secret and deploy.';
    case 'secret':
      return 'Supabase rejected the server secret key. Recreate the Supabase secret key and set SUPABASE_SECRET_KEY as a Cloudflare Worker secret.';
    case 'redirect':
      return 'Supabase rejected the invite redirect URL. Check Site URL and the Redirect URLs allowlist.';
    case 'email':
      return 'Supabase could not send the invite email. Check SMTP settings, sending limits and Auth logs.';
    case 'network':
      return 'Could not reach Supabase Auth. Try again or check Cloudflare Worker logs.';
    default:
      return 'Invitation failed. Check Cloudflare Worker logs for the redacted Supabase Auth error.';
  }
}

function logInviteError(label, error) {
  // Never log the secret value. These fields are enough to identify the cause
  // in Cloudflare observability without exposing credentials.
  console.error(label, {
    kind: inviteErrorKind(error),
    code: error?.code || null,
    status: error?.status || null,
    name: error?.name || null,
    message: error?.message || null,
  });
}

module.exports = {
  getSupabaseAdmin,
  isExistingUserError,
  inviteErrorKind,
  inviteFailureMessage,
  logInviteError,
};
