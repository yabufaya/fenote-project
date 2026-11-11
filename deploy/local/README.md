# Local PostgreSQL + Supabase Auth test (step 1 of the user's order)

The default local run is **local web + hosted Supabase**: all four units run
on this machine, but PostgreSQL, Auth, Storage and Realtime come from hosted
Supabase. No local PostgreSQL is started. No GitHub push, no Cloudflare
deployment. A single repo-root `.env.local` is the source for all four units;
it is **gitignored** and not in the patch. The optional local PG17 scripts and
`deploy/.env.example.local-pg17` remain only for deliberate offline DB tests.

## 0. What "real data from the schema" means

The obsolete `server/fenote_schema.sql` pg_dump was removed during fresh-only
cleanup. The canonical schema is `deploy/supabase/00_schema_clean.sql`: a
**fresh CREATE-only** 22-table schema with no data and no legacy `public.users`
table. There is no production data dump in the repository or workspace.

- The legacy SQL files under `server/` and `admin-app/backend/` do contain
  **mock rows**, but no production data. They were a MySQL/PostgreSQL hybrid;
  see `deploy/local/MYSQL_MOCK_DATA_ANALYSIS.md`.
- `deploy/local/04_mock_data_converted.sql` is the **converted PG17 seed** made
  from those mock rows (54 rows, 26 tables, real `/uploads/*` paths, no
  `public.users`). It is the default local seed — still mock data, not real data.
- `deploy/local/02_seed.sql` is a smaller hand-written alternative sample seed.
- To use your **real** data, supply a data-only dump:

```bash
DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DB' \
  bash scripts/export-local-data.sh /home/user/psychiatrist/deploy/local/real-data.sql
# then import into the local test DB:
psql "postgresql://postgres:localtest@localhost:5432/fenote_db" \
  -v ON_ERROR_STOP=1 -f deploy/local/real-data.sql
# re-apply RLS after importing:
psql "postgresql://postgres:localtest@localhost:5432/fenote_db" \
  -v ON_ERROR_STOP=1 -f deploy/supabase/01_rls.sql
```

`export-local-data.sh` uses `pg_dump --data-only` and excludes
`public.users`. Review the dump before importing: `bookings` contains patient
names, emails, phone numbers and `form_data`. If no dump is supplied, the local
test uses the clearly-labelled converted mock seed — do not describe it as real
production data.

## 1. PostgreSQL 17 in the sandbox

Installed system packages and `node_modules` are **not** persisted in the
workspace snapshot, so a fresh sandbox needs:

```bash
sudo apt-get update -qq && sudo apt-get install -y postgresql postgresql-client
sudo pg_ctlcluster 17 main start
pg_isready -h localhost -p 5432
bash scripts/install-all.sh   # npm ci in all four packages, --include=dev
```

`setup-local-db.sh` starts the cluster if it is already installed but not
running. On a fresh machine install PostgreSQL first as above.

`setup-local-db.sh` starts the cluster if needed, sets the local `postgres`
password to `localtest`, drops/recreates `fenote_db`, then applies:

1. `deploy/supabase/00_schema_clean.sql` — **fresh CREATE-only schema**: 21
   `CREATE TABLE` statements with inline identity columns, primary keys, the
   `blog_slug_key` unique constraint and 2 indexes; **no `ALTER` statements and
   no data**.
2. `deploy/local/04_mock_data_converted.sql` — 54 converted mock rows + sequence
   `setval`. Override with `SEED_FILE=deploy/local/02_seed.sql` for the smaller seed.
   Mock data is injected **only** from this separate seed file; the schema file
   contains no mock-data `INSERT` statements; booking defaults are configuration rows. For hosted Supabase, use the safe subset
   `deploy/supabase/05_optional_mock_content.sql` instead of these local files.
   `05` includes EN/AM translations and the three public Storage URLs for a
   fresh DB. There is no separate existing-DB migration; `00` already has the
   `translations` columns and `about.imageurl`.
3. `deploy/supabase/01_rls.sql` — roles, RLS, no anon direct writes. Its
   `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` lines are security toggles, not
   structural schema changes.
4. counts for a quick sanity check.

```bash
cd /home/user/psychiatrist
bash scripts/setup-local-db.sh
bash scripts/test-local-rls.sh
```

`03_test_rls.sql` checks:

- `anon` can read the 15 public content tables;
- `anon` **cannot** read `bookings` or `notifications`;
- `anon` **cannot** insert a booking directly; Express performs the validated insert;
- `service_role` can read that booking;
- every public table has `rowsecurity = true`;
- `to_regclass('public.users')` is NULL.

## 2. Supabase Auth setup (you must do this in the dashboard)

Public values supplied by the user, already in the env examples/local envs:

```
SUPABASE_URL=https://wscpswlfcruheibfyivm.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_NEW_SUPABASE_PUBLISHABLE_KEY
```

The JWKS endpoint returns an ES256 / P-256 key, so `getClaims()` verifies user
access tokens locally against the project's JWKS. The publishable key is an
`apikey` for `createClient` — **not** a Bearer token, not a JWT secret. No
`sb_secret_*` / service-role key was supplied and none is needed.

In the Supabase dashboard:

1. **SQL Editor** — run `00_schema_clean.sql` → `01_rls.sql` →
   `04_storage_and_admin_bootstrap.sql`. Replace `<SUPERADMIN_EMAIL>` with the
   first superadmin's exact email. No password or hash is stored in the DB.

> **42501 fix:** hosted Supabase owns `storage.objects` as `supabase_storage_admin`
> and already has RLS enabled there. `04_storage_and_admin_bootstrap.sql` no
> longer runs `alter table storage.objects enable row level security`; that
> statement is what raises `must be owner of table objects` [1](https://github.com/orgs/supabase/discussions/36611).
> Treat the Storage schema as managed/read-only [1](https://supabase.com/docs/guides/storage/schema/design),
> and keep only bucket rows + policies on `storage.objects` [1](https://supabase.com/docs/guides/storage/security/access-control).
> If a policy still returns 42501, create it in **Dashboard → Storage → Policies**.
> Never use a service-role key to work around it.

2. **Authentication → URL Configuration** — allow both admin origins with `/**`
   (this covers `/activate` and `/reset-password`), plus production later.
3. **Authentication → Providers → Email** — keep signups enabled so
   `signInWithOtp()` can create a first-time Auth account, and keep **Confirm
   email** on. Admin access is still invitation-only via `admin_profiles`.
4. **Authentication → Providers → Google** — add the Google Client ID/Secret in
   the dashboard only. The first superadmin activates at `/activate` or signs in
   with the same verified Google email; `link_admin_profile()` links the UUID.
5. Later admins are added by email only in **Admin access**. Supabase Auth
   handles rate limiting and password reset; the old Resend path is deleted.

## 3. Auth verification test

```bash
cd /home/user/psychiatrist/admin-app/backend
node scripts/test-auth.mjs
# live login (no password written to a file):
TEST_EMAIL='you@example.com' TEST_PASSWORD='...' node scripts/test-auth.mjs
# or verify an existing access token:
TEST_SUPABASE_TOKEN='eyJ...' node scripts/test-auth.mjs
# with a running admin API, also exercise the middleware:
TEST_EMAIL='you@example.com' TEST_PASSWORD='...' \
TEST_ADMIN_API_URL='http://localhost:5001/api' node scripts/test-auth.mjs
```

The script checks JWKS reachability, rejects an invalid JWT, optionally signs
in, calls `getClaims(token)` and prints `sub` / `role` / `email` / `iss`. It
never writes a password to the workspace. `@supabase/supabase-js` is pinned to
2.109.0 for Node >= 20; `ws` supplies the Realtime transport on Node 20.

## 4. Default: run the four units locally against hosted Supabase

In this mode the web SPAs and both Express APIs run on your machine, but
`DATABASE_URL`, Auth, Storage and Realtime all point at hosted Supabase. Do
**not** run `scripts/setup-local-db.sh` or `scripts/test-local-rls.sh`; those
are only for the optional local PG17 test mode.

First, in the Supabase SQL Editor, run `00_schema_clean.sql` → `01_rls.sql` →
`04_storage_and_admin_bootstrap.sql`. Replace `<SUPERADMIN_EMAIL>` with your
exact verified email, without `<`/`>`. If a further 42501 notice appears, use
Dashboard → Storage → Policies / New bucket. In Authentication → URL
Configuration add `http://localhost:5174/**` and
`http://localhost:5174/reset-password` (plus preview/production origins later).

Then:

```bash
cd /home/user/psychiatrist
bash scripts/setup-local-all-env.sh      # copies the hosted-Supabase template to .env.local
# edit .env.local once:
#   DATABASE_URL = hosted Supabase Postgres direct connection string
#   SUPABASE_URL + publishable key
#   VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
#   localhost origins / ALLOWED_ORIGINS
bash scripts/start-local-web.sh          # starts all four; Ctrl+C stops them
```

`start-local-all.sh` is a backwards-compatible alias for `start-local-web.sh`.
Both Vite configs set `envDir` to the repo root; both Express backends load
root `.env.local` before any package-local `.env` fallback. `VITE_*` values are
built into browser bundles, so rebuild the SPAs after changing them.

The same four raw commands are:

```bash
cd /home/user/psychiatrist
npm --prefix server start                 # http://localhost:5000
npm --prefix admin-app/backend start      # http://localhost:5001
npm --prefix fenote-app run dev          # http://localhost:3000 (vite.config.js)
npm --prefix admin-app/frontend run dev  # http://localhost:5174
```

The Vite dev proxies forward `/api` to the two backends. The admin SPA signs in
through Supabase Auth, sends the access token as `Authorization: Bearer`, and
passes it as `?token=` to the now-protected `GET /api/bookings/stream` SSE
endpoint. The public booking form remains anonymous.

## 4a. Arena live preview (running in this sandbox)

Both Vite configs now bind `0.0.0.0` and set `server.allowedHosts: true` so the
Arena/E2B preview host is accepted. Four `start_process` services were started:

| Service | Port | Preview URL |
| --- | ---: | --- |
| Public website | 3000 | `https://3000-${E2B_SANDBOX_ID}.e2b.app` |
| Admin website | 5174 | `https://5174-${E2B_SANDBOX_ID}.e2b.app` |
| Public API | 5000 | `https://5000-${E2B_SANDBOX_ID}.e2b.app` |
| Admin API | 5001 | `https://5001-${E2B_SANDBOX_ID}.e2b.app` |

The single repo-root `.env.local` is gitignored and contains these preview
origins. `VITE_API_URL=/api` uses the admin Vite proxy for both admin CRUD and
the authenticated admin SSE stream; no cross-origin public API URL is needed.
Both Express backends allow the preview origins in `ALLOWED_ORIGINS`.
Both Vite configs use `envDir` pointing at the repo root, so neither SPA reads
its old package-local `.env.local` anymore. In this sandbox only, the ignored
`.env.local` still targets local PG17 so the preview keeps working; the shipped
`deploy/.env.example.local-all` template targets hosted Supabase.

Verified with the preview `Host` header: public/admin HTML 200, public
`/api/blog/blogs` proxy 200, admin `/api/blogs` correctly 401 without a token,
`/uploads/...` proxy 200, public API CORS returns the admin origin, both
`/health` endpoints 200.

The admin SPA will render the Supabase Auth login page, but signing in still
requires a real admin user created in the Supabase dashboard. No secret key is
used. These preview processes are local only — no GitHub push or deployment.

## 4b. UI/i18n/admin corrections applied before local implementation

Per the user's "before we implement and test on local development" direction, the
following fixes were applied locally (no remote work):

- Clients: one CSS marquee definition, two seamless logo groups, pause on hover,
  reduced-motion fallback, and a scroll-reveal safety timer so logos never stay hidden.
- Fenote Connect section removed from Home; `Connect.jsx` and `connect.*` translation keys deleted.
- Duplicate map removed: only the Footer "Find Us" embed remains; Contact keeps form + quick info. The Footer now sanitizes `map_embed_url` through `src/utils/mapUrl.js`.
- Amharic/English: 355 keys per locale; every static label, placeholder, loading/error/empty state, footer, overlay, trust badge and booking-form option is translated. `<html lang>` follows the language toggle.
- Admin: Hero and About now use one headline + one description with automatic accent/line splitting (`src/utils/splitText.js`) and a live preview; the existing Express/Supabase-backed API and DB fields are unchanged.
- Theme: dark mode kept, but the WebGL particle animation is frozen (`frameloop="demand"`, no `useFrame`), with lower opacity/contrast and fewer particles.
- Footer: the bottom grid (logo, links, services, hours, contact, bottom bar) now uses a calm near-black `#0B0F14` surface with light slate text; the newsletter banner and Find Us/map section are unchanged.
- Subscribers / messages: `subscribers` (email-only), `contact_messages`, `messages` and `message_recipients` tables; Footer subscribe and public Contact form now POST to the API instead of showing fake alerts.
- Admin: new **Subscribers** page (total/today/7-day counts + email list/CSV) and **Messages** page (contact inbox + subscriber-message drafts/queue). New contact messages and campaign events create traceable notifications.
- Live bookings: one authenticated SSE bridge is driven by PII-free Postgres `LISTEN/NOTIFY`; `booking_availability_state` is the only safe booking-related Realtime table. `01_rls.sql` adds the `supabase_realtime` publication and `REPLICA IDENTITY FULL`; local PG uses `wal_level=logical`.
- Public content Realtime: the public SPA subscribes to all 15 content tables and refetches the affected Hero/About/Blog/Services/Gallery/Resources/Testimonials/Team/Clients/Contact/Payments/Highlights section on change. A polling + tab-focus fallback covers anonymous DELETE events and disconnects.

Both Vite production builds pass. Preview checks: public/admin HTML 200,
`/api/clients` and `/api/contact` 200, client upload 200, admin protected
`/api/hero` 401, public API CORS returns the admin origin, both `/health` 200.
The Footer map URL is currently empty in the converted mock data, so it shows the
localized "Map loading..." fallback rather than loading a second map. The Gallery
overlay still contains its pre-existing YouTube `<iframe>` (not a map).

## 5. Cloudflare-first notes for the local test

- `deploy/cloudflare/*` are the **primary** deployment templates;
  `deploy/render.yaml` is only a portable fallback.
- Hyperdrive needs Supabase's **direct** connection string and `pg >= 8.16.3`.
- Workers' `node:fs` is ephemeral: multer disk uploads must move to Supabase
  Supabase Storage direct uploads are implemented; multer disk is only an offline fallback.
- The SSE bridge uses one dedicated DB `LISTEN` connection per running API process; validate long-lived connections on the chosen Worker platform.
- Worker entries assign `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `ADMIN_APP_ORIGIN`, `ALLOWED_ORIGINS`, `ADMIN_URL`, `PUBLIC_URL`,
  `NODE_ENV`, `PG_POOL_MAX` and `UPLOAD_DIR` from Worker bindings before
  requiring the Express app. Validate the `ws` transport on Workers before
  deploying.

## 6. Verified in this sandbox (2026-11-03)

- PostgreSQL 17.11 installed, cluster started, `fenote_db` created.
- `00_schema_clean.sql` created 26 tables with fresh `CREATE TABLE` statements
  (0 structural `ALTER`); `04_mock_data_converted.sql` inserted 54 converted mock rows (3 blogs, 3 bookings, 3 notifications,
  9 services, 8 payment packages, etc.).
- `01_rls.sql` applied; local `service_role` is created with `BYPASSRLS` to
  match Supabase's trusted-server semantics.
- `03_test_rls.sql`: anon reads 3 blog rows, anon read denied on `bookings` and
  `notifications`, anon direct booking insert is denied, `service_role` reads private tables, 0
  tables without RLS, `to_regclass('public.users')` is NULL.
- `test-auth.mjs`: JWKS reachable (ES256 key `c0f75fe3-…`), invalid JWT rejected.
- Both Vite builds pass; all backend JS files pass `node --check`.
- With both APIs running on 5000/5001: `/health` 200; public
  `/api/blog/blogs`, `/api/hero`, `/api/services`, `/api/team`, `/api/about`,
  `/api/payments` 200; public `POST /api/bookings` with a valid slot 201; SSE without/invalid
  token 401; admin API without/invalid token 401.
- Arena live preview started: public site 3000, admin site 5174, public API
  5000, admin API 5001; preview-host HTML, proxies, CORS and health checks passed.
- Live admin login with a real Supabase user was **not** run because no admin
  user credentials were supplied.

## 7. What is NOT verified yet

End-to-end admin login against a real Supabase user, a live Cloudflare Worker,
Hyperdrive, Storage, Realtime, a production `pg_dump --data-only` import, and a
remote migration. Those require the admin user, a data dump, and explicit
confirmation to deploy. This patch is local only.
