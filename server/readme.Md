# Public API notes — superseded

This file used to contain a conflicting hand-written schema and a default
admin credential insert. It is no longer authoritative.

Canonical, PG17-safe schema: `../deploy/supabase/00_schema_clean.sql`.
Real data: supply `pg_dump --data-only`; the committed dump is schema-only.
Local test: `../deploy/local/README.md`.
Deployment: `../deploy/README.md` (Cloudflare-first).
Auth: `../deploy/supabase/02_auth_migration.md`.

The public API serves the site, accepts anonymous bookings, and protects the
admin SSE stream with a Supabase access token. It uses one `DATABASE_URL`
shared with the admin API. There are no default admin credentials.
