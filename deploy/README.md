# Deployment guide — fresh Supabase + production-safe live booking

This directory contains local artifacts for the patch. Nothing here has been
pushed to GitHub, deployed, or executed against hosted Supabase production.

## Fresh Supabase SQL Editor order

Run these **on a new/empty database only**, in this exact order:

1. `supabase/00_schema_clean.sql` — 26 CREATE-only tables, bilingual `translations` columns, booking availability settings/rules/slots/state, atomic booking functions and PII-free DB event triggers.
2. `supabase/05_optional_mock_content.sql` — optional visual seed only. Resources and Gallery are intentionally empty. Hero/About use `logo.png`, Blog/Highlights use `blog.jfif`, doctor/team images use `doc.jfif` on the new Storage project.
3. `supabase/01_rls.sql` — RLS, public read for content + the safe availability version row, helper-function privileges, Realtime publication and the first slot generation.
4. `supabase/04_storage_and_admin_bootstrap.sql` — Storage buckets/policies + first superadmin. Replace `<SUPERADMIN_EMAIL>` with the exact verified email, without `<` or `>`.

There is no `06` upgrade script, no reset/drop script, no legacy `public.users`,
and no existing-database migration. Do not run `00` on a populated database.
`05` refuses to seed if `public.team` already has rows.

Upload `logo.png`, `blog.jfif` and `doc.jfif` to the public `fenote-images`
bucket. `04` creates buckets but does not upload media files.

## Runtime topology — ONE Cloudflare application

```
https://PUBLIC_DOMAIN/                 -> public Vite SPA (cloudflare-dist/index.html)
https://PUBLIC_DOMAIN/admin           -> admin Vite SPA (cloudflare-dist/admin/index.html)
https://PUBLIC_DOMAIN/api/*           -> public Express API
https://PUBLIC_DOMAIN/api/admin/*     -> admin Express API
https://PUBLIC_DOMAIN/health          -> combined Worker health
                                   |
                     ONE Worker + Static Assets + Hyperdrive
                                   |
                                   +-> Supabase Postgres (one DATABASE_URL)
                                   +-> Supabase Auth (JWKS / getClaims)
                                   +-> Supabase Storage (images / videos / PDFs)
                                   +-> Supabase Realtime (public content + safe availability version)
                                   +-> Postgres LISTEN/NOTIFY -> authenticated admin SSE
```

`wrangler.jsonc` and `deploy/cloudflare/one-worker.example.js` are the
single-project deployment. `scripts/build-cloudflare-one-app.sh` builds both
SPAs into one `cloudflare-dist/` output. It derives the required `VITE_*`
build-time values from `wrangler.jsonc` vars via
`scripts/vite-env-from-wrangler.mjs`, so Cloudflare Build variables do not
need to duplicate the Supabase URL or publishable key. `server/src/cloudflareOneApp.js`
mounts both Express apps behind one Worker. The Worker keeps all binding
access and database I/O request-scoped: `FENOTE_WORKER_RUNTIME=cloudflare`
selects a per-request `pg.Client` instead of a global `pg.Pool`, rate-limit
stores use no global timers, and admin SSE LISTEN state is per request. Rate
limiters use a Worker-safe client key from `cf-connecting-ip` /
`x-forwarded-for` instead of the `req.ip` getter, which is undefined on the
Workers Node bridge. This prevents Cloudflare validation error `10021`
(`Disallowed operation called within global scope`) and the
`ERR_ERL_UNDEFINED_IP_ADDRESS` warning. Locally the four-unit layout still
works unchanged; the admin base is `/` locally and `/admin` in the one-app
build. Admin invitation and password-reset links use
`ADMIN_APP_ORIGIN` + `ADMIN_APP_BASE_PATH`, so set `ADMIN_APP_BASE_PATH=/admin`
in Cloudflare. The older `wrangler.public.example.toml`,
`wrangler.admin.example.toml`, `public-worker.example.js` and
`admin-worker.example.js` assume two Workers and are not used here.

### Strict invite-only admin Auth

Public signups are **OFF**. There is no public `signUp()` call, no hidden
sign-up button and no public activation endpoint. The superadmin adds an exact
email; the backend inserts an active `admin_profiles` row and calls
`inviteUserByEmail()` from the trusted server with `redirectTo` pointing at
`/admin/activate`. The invitee creates an 8+ character password (letters and
numbers), then signs in with email/password or with Google using that same
already-existing, active admin email. `getClaims()` plus
`link_admin_profile()` remains the final authority, so Google cannot create a
new admin account. Invitation activation, password reset and login share an
8+ character policy (letters and numbers) with show/hide eye toggles. After a
password is set, the UI verifies it can sign in before discarding the temporary
session. Supabase Auth stores salted bcrypt hashes; this app stores no
plaintext password or hash.

Supabase **URL Configuration**: Site URL must be the root
`https://fenote.anatamabraham.workers.dev`; redirect URLs are
`https://fenote.anatamabraham.workers.dev/**`,
`https://fenote.anatamabraham.workers.dev/admin/**` and the explicit
`https://fenote.anatamabraham.workers.dev/admin/activate`. Keep **Confirm
email ON** and **Allow new users to sign up OFF**. Keep the default Invite user
email template using `{{ .ConfirmationURL }}`. The Supabase secret key belongs
**only** in the Cloudflare Worker secret store:

```bash
npx wrangler secret put SUPABASE_SECRET_KEY
```

Never place that key in `wrangler.jsonc` `[vars]`, `VITE_*`, source, patch,
ZIP, frontend or chat. See `supabase/02_auth_migration.md` for the full flow.

### Bilingual admin content

Every public content add/edit form now has compact `EN | አማ` tabs. One
protected request writes the English/base columns and `translations.en` /
`translations.am` in one transaction. Empty Amharic fields fall back to English
on the public site. Categories, regions, package keys, slugs, media URLs,
numbers, CSS classes and timestamps are never translated.

The generic `/api/content/:table` save endpoint introspects the actual table
columns before building SQL. It creates the EN/AM JSONB object from parameters
and never references the target table's `translations` column inside an INSERT
`VALUES` expression. It writes `updated_at` only when that column exists.
`hero_slide` now includes `updated_at` in fresh schemas, while the endpoint
still works with earlier fresh installs that omitted it.

### Booking privacy and atomic slot locking

- Public visitors never read `bookings`, `contact_messages`, `subscribers`, `notifications`, `booking_slots` or availability rules through the Supabase Data API.
- All public writes go through Express, which connects as `postgres`.
- The public form receives only PII-free available time choices.
- `create_booking()` locks the exact slot row, inserts a `pending` booking under a partial unique index, and returns only id / slot / status / expiry.
- A submitted slot disappears from every open public form via one Realtime event on `booking_availability_state`; it does not wait for admin confirmation.
- Admin confirmation keeps the slot reserved. Denial, cancellation, deletion or pending-hold expiry releases it.
- Admin live events are PII-free `pg_notify` payloads delivered by the admin backend over one authenticated, same-origin SSE connection (`/api/admin/bookings/stream` in the one-app build, `/api/bookings/stream` locally). Private tables are not in the public Realtime publication.

### Admin working hours

`/booking-availability` lets an admin set open/closed status, open/close time
and slot length for each weekday, plus the booking window and pending-hold
expiry. Fresh defaults are Monday–Friday 08:00–18:00, Saturday/Sunday closed,
30-minute slots, a 7-calendar-day rolling window (admin-selectable 1–7),
30-minute pending hold, all in `Africa/Addis_Ababa`. Saving rebuilds future free slots in one DB transaction;
reserved slots are preserved.

## Acceptance checklist fixes

- Booking uses a rolling 7 **calendar** days from clinic-local today in
  `Africa/Addis_Ababa`. `GET /api/bookings/availability` returns all seven dates
  with `is_open`, `day_of_week`, `slot_count` and admin hours. Monday–Friday use
  the admin schedule; Saturday/Sunday are closed by default and show a clear
  closed/no-slots state. `ensure_booking_slots_current()` regenerates the rolling
  window when the clinic-local date changes, and the public Schedule step reads
  those dates rather than guessing. Closed and full dates are disabled, not
  silently reported as “not available”.
- `hero_content` is two bilingual boxes: a Title quote (`Restoring` /
  `Balance In Life`) and Below lines (the three supporting lines). Fixed public
  styling supplies the bold/italic accents. `hero_slide` and `client` are
  image-only tables; their unused text columns are removed for a fresh start.
  Admin Hero Management has Hero Text and Carousel Images tabs, while Trusted
  Companies has one image upload/delete grid and static EN/AM headings.
- The trusted-companies marquee no longer inherits `section-fade`; its CSS forces
  visibility and the image grid renders even when an uploaded row has no text.
- The bell red dot is driven by the protected unread count. Opening
  Notifications immediately marks all notifications read; viewing Messages
  marks contact messages and related notifications seen. The dot stays away
  after a page is seen, instead of relying only on manual buttons.
- The generic content save endpoint introspects real columns, so all 15 fresh
  content-table saves succeed without the old `42703` mismatch. Dashboard,
  subscribers, message submission, admin access, About Us and Hero text update
  remain in place.

No hosted SQL, deploy, commit, push or production migration is included here.
Apply the fresh SQL only after local validation succeeds.

## Auto-read safety / pg-pool timeout

`timeout exceeded when trying to connect` from `pg-pool` is a database
connection-acquisition timeout, not a Supabase login/session timeout. The
previous auto-read wiring could feed itself: a `mark all read` UPDATE emitted an
admin SSE event, which triggered another `mark all read`, exhausting the small
pool. The fresh build prevents that loop at three layers:

- `/notifications/read-all` and `/messages/read-all` update only
  `WHERE is_read = FALSE`, so repeated calls change zero rows.
- Fresh SQL `admin_event_notifications` and `admin_event_contact_messages`
  triggers fire on `INSERT OR DELETE`, not on read-state `UPDATE`.
- The admin SPA dispatches red-dot refreshes only on real INSERT events, marks
  seen once on page view with an in-flight guard, and debounces a new message
  arriving while Messages/Notifications is already open. Read-state updates no
  longer call auto-read.

New notification/message INSERT events still refresh the red dot and live lists.
No hosted SQL or pool-size change is required for this fix.

## Files

| Path | Purpose |
| --- | --- |
| `supabase/00_schema_clean.sql` | Fresh CREATE-only PG17/Supabase schema and booking logic |
| `supabase/01_rls.sql` | RLS, public reads, helper privileges, safe Realtime publication, slot generation |
| `supabase/02_auth_migration.md` | Auth implementation status + dashboard steps |
| `supabase/04_storage_and_admin_bootstrap.sql` | Storage buckets/policies + first superadmin; 42501-tolerant |
| `supabase/05_optional_mock_content.sql` | Optional fresh bilingual seed with new Storage URLs; empty Resources/Gallery |
| `local/04_mock_data_converted.sql` | Local PG17 legacy mock seed; not for hosted SQL Editor |
| `local/README.md` | Local PostgreSQL + Auth test runbook |
| `.env.example.local-all` | Default one-root env for local web + hosted Supabase |
| `.env.example.local-pg17` | Optional offline local PG17 template |
| `.env.example.*` | Per-unit fallbacks; public Supabase values only |
| `cloudflare/wrangler.*.example.toml` | Worker configs (Hyperdrive + vars) |
| `cloudflare/*-worker.example.js` | Worker entries using `httpServerHandler` |
| `render.yaml` | Portable fallback blueprint |

## Quick local start

```bash
cd /home/user/psychiatrist
# 1. FRESH Supabase DB: SQL Editor 00 -> optional 05 -> 01 -> 04.
# 2. Upload logo.png, blog.jfif, doc.jfif to public fenote-images.
# 3. Supabase Auth -> URL Configuration: Site URL is the root production origin,
#    not /admin. Add production /** and /admin/**, plus localhost:5173/**
#    and 5174/** only for local testing. Email signups OFF; Confirm email ON.
bash scripts/install-all.sh
bash scripts/setup-local-all-env.sh
#    Paste the NEW project's DATABASE_URL, SUPABASE_URL, publishable key,
#    VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. For strict-invite
#    local testing, also paste SUPABASE_SECRET_KEY into the ignored .env.local.
#    Keep DATABASE_SSL=true; do not append ?sslmode=require.
bash scripts/start-local-web.sh
```

The example env files use `YOUR_NEW_SUPABASE_PUBLISHABLE_KEY` placeholders.
The current one-app config uses `https://aifieorxqzuqwzbrudpn.supabase.co`;
Auth, Realtime and Storage must use that same project's URL and publishable
key. Do not reuse an old project's key with the new URL.

## Security notes

- A `sb_publishable_*` key is client-safe; it is not a Bearer token or JWT secret. Never use a `sb_secret_*` key in `VITE_*` values.
- `SUPABASE_SECRET_KEY` is required for server-side invitations and belongs only in the Cloudflare Worker secret store (or an ignored local `.env.local` for local testing). It is not in `wrangler.jsonc`, source, patch, ZIP or frontend.
- All credentials pasted earlier are considered compromised and must be rotated. No real secrets are in this workspace or patch.
- No anonymous direct INSERT remains on private tables; this prevents bypassing slot locking and validation through the Data API.
- Express connects as `postgres` via `DATABASE_URL` and bypasses RLS; RLS protects the Supabase Data API. Never expose the DB URL to browsers.
- Admin identities live in `auth.users`; there is no legacy custom users table.
- No hosted SQL execution, deploy, commit, push, live Auth/Storage/Realtime production test or production migration was performed.
