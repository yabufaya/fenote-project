# Content update consistency fix

## Problem

A successful `UPDATE public.blog ... RETURNING *` committed to Postgres, but
the admin or public browser sometimes kept showing the previous content. The
database was correct; the browser was holding an older copy.

Causes fixed here:

- The admin save ignored its own `RETURNING *` row and trusted a later GET.
- Admin content GETs had no `Cache-Control: no-store` and could be reused as a
  conditional `304`.
- An older in-flight GET could finish after a newer save and overwrite React
  state.
- Singleton forms initialized once and were not refreshed from committed rows.
- The original live path depended on Supabase Postgres Changes. When its
  WebSocket was blocked/disconnected, the public fallback waited up to 45
  seconds and admin content pages had no polling fallback.
- EN/AM translation overlays and different public URLs can still make two views
  look different; those remain application behavior, not a failed save.

## What changed

### 1. Read-after-write guarantee in the admin UI

`ContentManager.jsx` now:

- applies the row returned by `PUT/POST /api/admin/content/:table/:id`
  immediately to `rows` and the open form;
- preserves the current EN/AM tab after save;
- refreshes singleton forms from committed rows when there are no unsaved edits;
- warns instead of clobbering a dirty singleton form when another admin changes
  the same section;
- numbers every `fetchRows()` request and ignores stale responses;
- removes a deleted row immediately;
- broadcasts `fenote:content-change` after save/delete so other tabs refresh
  at once.

### 2. No stale HTTP reads

- Admin `/api/admin/content/*` responses send `Cache-Control: no-store` and
  delete conditional `If-None-Match` / `If-Modified-Since` request headers.
- Public `/api/*` GET responses also send `no-store`.
- Admin content list adds a harmless unique `_` query as a second cache guard.

### 3. Deterministic live refresh

Added a tiny, PII-free endpoint:

```text
GET /api/content-version
GET /api/admin/content-version
```

It returns only an MD5 version and per-table stamps:

```json
{
  "success": true,
  "version": "…",
  "tables": { "blog": "3:2720", "about": "1:2720" },
  "checked_at": "…"
}
```

Stamps use `count(*)` and Postgres `xmin`, so inserts, updates and deletes are
detected without a schema migration, new table, trigger, timestamp column or
exposure of row contents. No Supabase SQL Editor change is required.

Both SPAs mount `useContentVersion()`:

- one visible tab per origin is elected leader through a short `localStorage`
  lease;
- the leader checks the version every 5 seconds;
- changes are broadcast with `BroadcastChannel`, with a `storage` event
  fallback;
- `fenote:content-change` carries the changed table names;
- `usePublicRealtime()` and `useSupabaseRealtime()` refetch only matching
  sections;
- existing Supabase Realtime remains the instant path;
- public 45-second and admin 30-second full-refresh fallbacks remain as safety
  nets;
- tab focus, visibility and online events trigger an immediate check.

The version endpoint has its own rate limiter and is excluded from the general
content/admin limiter. Default cap is 3000 checks / 15 min; override only with
the non-secret runtime var `CONTENT_VERSION_READ_MAX` if ever needed.

### 4. True realtime push from the server

After every committed content INSERT/UPDATE/DELETE, the trusted admin API now
publishes a tiny Supabase Realtime **Broadcast** message:

```text
POST https://<project>.supabase.co/realtime/v1/api/broadcast/fenote-content/events/content-change
```

It uses the existing `SUPABASE_SECRET_KEY` Worker secret in the `apikey` header.
New Supabase secret keys are API keys, not JWTs, so they must not be sent as
`Authorization: Bearer` [1](https://supabase.com/docs/guides/getting-started/api-keys).
The Realtime REST endpoint is documented by Supabase [2](https://supabase.com/docs/guides/realtime/broadcast).

The public channel is `fenote-content`, event `content-change`. Its payload
contains only:

```text
message_id, version, tables[], action, row_id, sent_at
```

No row text, email, token, password or API key is published.

Both SPAs subscribe to that public channel with the publishable key. On receipt
they dispatch `fenote:content-change` immediately, so connected public browsers
and other devices refetch the changed section without waiting for the 5-second
version poll. Messages are deduplicated; a short suppression window avoids a
duplicate GET when the next version poll observes the same commit.

This is **ephemeral messaging**, not a database table: no SQL migration,
trigger, `realtime.messages` policy or Realtime publication change is needed.
If the WebSocket is blocked, the message is skipped naturally and the 5-second
version poll/full section fallbacks still apply. If `SUPABASE_SECRET_KEY` is not
available, the helper skips quietly and never turns a successful save into an
error.

### 5. Cross-tab instant save

`publishContentChange(table)` dispatches the same event immediately after a
successful admin save/delete. Admin and public tabs on the same origin therefore
refresh without waiting for the next 5-second poll. Other devices use the
server Realtime Broadcast immediately, or the version poll when WebSockets are
unavailable.

### 6. Exact blink-back fix: committed-row transaction token

The hero symptom was:

```text
save → new value → a few seconds → previous value → later → new value
```

The database was correct. A later `GET /api/admin/content/hero_content`
returned an older snapshot and replaced React state; a still later GET returned
the committed row again. Request ids alone cannot reject a stale response that
starts **after** the save but still carries old data.

The fix is a server-authoritative freshness token on every content row:

```sql
-- list and RETURNING *
select *, xmin::text as _row_version ...
returning *, xmin::text as _row_version
```

`xmin` is a read-only Postgres system column; an UPDATE/INSERT gives the row a
newer transaction token. No schema migration, trigger, table or secret is added.

`ContentManager.jsx` now:

- applies the `RETURNING *` committed row immediately;
- increments a request id **and** a write revision, invalidating pre-save GETs;
- keeps that committed row protected for 75 seconds (Hyperdrive's 60s
  `max_age` + 15s `stale_while_revalidate`);
- rejects any fetched row with an older `updated_at` or older `_row_version`;
- accepts a newer external edit immediately;
- keeps the protection entry instead of deleting it after one good GET, so a
  later cached GET cannot revert the form;
- protects a just-deleted id from reappearing from a stale GET;
- removes the redundant local `fenote:content-change` dispatch from the saving
  tab, while still broadcasting to other same-origin tabs.

So the exact rule is: **only a response that is at least as new as the
committed save may replace it**. This is a client-state race fix. It adds one
read-only token to the content API response; it does not change the database
schema, strict Auth, Realtime payload, secrets or `wrangler.jsonc`.

### 7. Public-site Realtime token fix

The public SPA was also slow because its anonymous `supabase-js` client had no
Supabase Auth session. In that case the library falls back to sending the
**publishable key as the Realtime `access_token`**. A `sb_publishable_...`
value is an opaque API key, not a JWT. The Realtime channel can therefore fail
to join, leaving only the 5-second version poll and 45-second section fallback
— which looks like “the database is fast but the public site is late”.

`fenote-app/src/lib/supabase.js` now sets:

```js
accessToken: async () => ''
```

The public WebSocket joins with `apikey` only and no user JWT. This is correct
for an anonymous public channel. It fixes `useContentVersion` Broadcast and
`usePublicRealtime` Postgres Changes subscriptions. Strict admin Auth is
unchanged; the admin client still uses real session JWTs.

The public hook now also warns on `CHANNEL_ERROR`, `TIMED_OUT` or `CLOSED`, so
a blocked WebSocket is visible in DevTools instead of silently falling back.

### 8. Hidden-tab leader lease fix

A DevTools capture showed admin `GET /api/admin/content/hero_content` requests
about 30 seconds apart. The first two responses had the same ETag; the third
had a new ETag. That is the **fallback poller**, not Realtime and not the 5s
version poll. `Cache-Control: no-store` was present, so this was not an HTTP
cache problem.

The cause was the shared `localStorage` leader lease:

- only one same-origin tab polls `/api/content-version` every 5 seconds;
- a tab that became hidden stopped polling but **kept renewing the lease**;
- visible tabs could not become leader, so the 5s poll stopped;
- only the 30s admin / 45s public section fallback remained.

Both `useContentVersion` hooks now:

- never claim or renew the lease while `document.hidden`;
- release the lease and send `leader-release` when hidden or on `pagehide`;
- let a visible tab claim leadership immediately;
- still receive BroadcastChannel/storage events while hidden.

So a visible public/admin tab always owns the 5s version poll. Together with
the token fix in section 7, Realtime gives sub-second updates; if WebSockets are
blocked, the visible tab still refreshes within about 5 seconds instead of
waiting for the old fallback.

### 9. Exact root cause: Cloudflare Hyperdrive query cache

The latest DevTools capture proved the remaining problem is **not React,
Supabase, or browser HTTP cache**:

```text
POST 14:12:10 → committed row  title "GAG"   _row_version 4658
GET  14:12:10 → old row        title "DADA"  _row_version 4653
GET  14:12:30 → still old row
GET  14:13:00 → new row        title "GAG"   _row_version 4658
```

A successful write returns the committed row, but the next matching `SELECT`
returns a cached pre-write result for ~50 seconds. `Cache-Control: no-store`
cannot help because the cache is inside **Cloudflare Hyperdrive**, before the
Worker/Express response is built.

Hyperdrive query caching is enabled by default: `max_age=60s`,
`stale_while_revalidate=15s`. Writes do **not** invalidate cached reads
[1](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/).
Cloudflare explicitly recommends a cache-disabled configuration for admin
settings and reads immediately after a write.

## Required one-time account fix

Disable caching on the existing single Hyperdrive config. The ID comes from
root `wrangler.jsonc`:

```bash
npx wrangler hyperdrive update 052cf4d4a27e40dbb69abb876cf1b1bc --caching-disabled
```

Or: Cloudflare Dashboard → Workers & Pages → Hyperdrive → select that config →
disable query caching. Then **Retry build** once so new pooled connections use
the updated config.

Do **not** edit `wrangler.jsonc`. Do not add a second binding, new secret, SQL
migration, or new Worker var. Connection pooling stays enabled; only Hyperdrive
SQL-result caching is turned off.

The 75-second client guard in section 6 is a safety net for any cached response
still in flight. The account setting above is the real fix for both admin and
public freshness.

## What did NOT change

- Root `wrangler.jsonc`: unchanged. No `VITE_*`, secret, Site URL, Redirect URL,
  or `wrangler.jsonc [vars]` edit is required.
- Strict invite-only Auth, active `admin_profiles` authority, Google behavior
  and password rules: unchanged. The existing `SUPABASE_SECRET_KEY` Worker
  secret is also reused for the server broadcast; no new secret value or
  frontend exposure is introduced.
- Supabase Auth / SQL schema / RLS / Realtime publication: no migration needed.
  Keep the existing `01_rls.sql` setup on the hosted database. Admin content
  reads/writes now include a read-only `_row_version` token from Postgres
  `xmin`; this is not a schema column and requires no SQL.
- One `fenote` Worker, one Hyperdrive binding, one domain: unchanged. Only the
  existing Hyperdrive config's query-caching setting is turned off.
- No public signup, no new secret key, no password/hash handling, no cPanel or
  old `fenotepsych.com` website change.

## Build/deploy

Use the refreshed `fenote-github-push.zip`:

1. Run the one-time Hyperdrive command in section 9:
   `npx wrangler hyperdrive update 052cf4d4a27e40dbb69abb876cf1b1bc --caching-disabled`.
2. Push the ZIP to the same GitHub repository used by the `fenote` Worker.
3. In Cloudflare Workers Builds, click **Retry build** for the same `fenote`
   Worker. Only `NODE_VERSION=22` remains required as a Build variable.
4. After the deploy succeeds, hard-refresh:
   - `https://fenote.anatamabraham.workers.dev/admin/`
   - `https://fenote.anatamabraham.workers.dev/`
5. Edit and save the hero title. It must stay on the new value continuously:
   no blink back to the old value, then no delayed re-correction. Other
   same-origin tabs should change immediately; other devices with a working
   WebSocket should change via Realtime Broadcast in under a second. Browsers
   that block WebSockets still update via the version poll within about 5
   seconds.

No `npx wrangler secret put`, Supabase SQL, DNS, Resend or email change is part
of this fix.

## Validation performed locally

- `bash scripts/build-cloudflare-one-app.sh`: both SPAs built successfully.
- `wrangler@4.158.0` / Node 22 `deploy --dry-run`: passed, 25 static assets.
- Broadcast helper tested against a local mock HTTP server: correct REST path,
  `apikey` header, no `Authorization: Bearer`, PII-free payload, and graceful
  skip for a missing/publishable key.
- Stale-GET protection logic tested directly with the captured rows:
  `_row_version 4653` at +20s is rejected against saved `4658`, the same
  committed row is accepted, a newer external edit is accepted, and the 75s
  protection expires. Older `updated_at`, missing `_row_version`, and
  timestamp-less rows are also covered.
- Local one-Worker dev server with a dummy secret on `:8790` after the
  blink-back fix, and `:8791` after the public Realtime token fix:
  - `200 /health`
  - `200 /api/content-version`
  - `200 /api/admin/content-version`
  - `200 /api/blog/blogs/recent?lang=en`
  - `200 /`
  - `200 /admin/`
  - `401 /api/admin/content/hero_content` without a bearer token
  - `Cache-Control: no-store` present on version, public content and protected
    admin content responses.
- Version probe: inserting a local test blog changed the version; deleting it
  restored the exact original version.
- Local Postgres check: `select *, xmin::text as _row_version` and
  `update ... returning id, xmin::text as _row_version` both executed; the
  rollback left no test row changed.
- `supabase-js` token test: without the callback the anonymous Realtime token
  was the publishable key; with `accessToken: async () => ''` it is empty, so
  the public channel joins with `apikey` only.
- Served public bundle on `:8791` contains the empty-token client and references
  `index-CAeuqJgp.js`; `/`, `/admin/`, `/health`, `/api/content-version` and the
  new JS asset all returned `200`.
- Built bundles contain `pagehide` and `leader-release`, confirming the hidden
  leader no longer blocks visible tabs.
- Built browser bundles contain the public Realtime topic/event but no Realtime
  REST URL and no real secret key.
- No Worker log errors during those checks. No hosted Realtime Broadcast was
  sent during local validation.
- Temporary local `wrangler.dev.jsonc` was removed; hosted configuration and
  database were not touched.
