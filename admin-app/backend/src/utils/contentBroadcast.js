// Server-only Supabase Realtime Broadcast publisher.
//
// A database commit does not push itself into a browser. After a successful
// content write, this sends a tiny public "something changed" signal over
// Supabase Realtime. Connected public/admin browsers refetch only the changed
// section. The payload contains no row data, email, token or secret.
//
// SUPABASE_SECRET_KEY stays a Cloudflare Worker secret. New Supabase API keys
// are sent in the `apikey` header, not as an Authorization: Bearer JWT.
const TOPIC = 'fenote-content';
const EVENT = 'content-change';
const TIMEOUT_MS = 2500;

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function broadcastContentChange({ table, action, rowId = null }) {
  const baseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const secretKey = String(process.env.SUPABASE_SECRET_KEY || '').trim();

  // Broadcasting is an acceleration, not part of the commit. If the secret is
  // missing locally, skip quietly; the version poll remains the fallback.
  if (!baseUrl || !secretKey || secretKey.startsWith('sb_publishable_') || secretKey.startsWith('VITE_')) {
    return { sent: false, reason: 'not-configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${baseUrl}/realtime/v1/api/broadcast/${encodeURIComponent(TOPIC)}/events/${encodeURIComponent(EVENT)}`;
    const payload = {
      message_id: messageId(),
      version: messageId(),
      tables: [table],
      action,
      row_id: rowId,
      sent_at: new Date().toISOString(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('Content broadcast rejected:', response.status);
      return { sent: false, status: response.status };
    }
    return { sent: true };
  } catch (error) {
    console.error('Content broadcast failed:', error?.name || 'unknown');
    return { sent: false };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { broadcastContentChange, TOPIC, EVENT };
