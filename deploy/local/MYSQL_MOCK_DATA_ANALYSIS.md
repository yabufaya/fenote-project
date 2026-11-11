# Analysis: legacy "MySQL?" schema + mock data in `server/`

**Question from the user:** "you can analysis the database schema in the server folder that have mock data maybe it mysql try to convert it first see the analysis"

**Verdict:** The files are **not pure MySQL**. They are a **hybrid**: two MySQL-only statements wrapped around mostly PostgreSQL DDL/DML, plus destructive statements, conflicting definitions, default admin credentials and broken asset paths. I recovered them from the original commit, analysed them, and produced a PostgreSQL 17-safe **data-only** conversion that runs on the canonical cleaned schema.

---

## 1. Sources recovered from git HEAD

The current patch deletes these legacy files, so they were read with
`git show HEAD:<path>`:

| File | Lines | Size | What it contains |
| --- | ---: | ---: | --- |
| `server/database-schema.sql` | 362 | 18.6 KB | Main file: schema DDL + the largest set of mock `INSERT`s. |
| `admin-app/backend/database-schema.sql` | 202 | 11.2 KB | Mostly a subset of the same schema/mock data, plus a bcrypt admin hash. |
| `admin-app/backend/admin-schema.sql` | 45 | 1.6 KB | Only `users`, `notifications`, `bookings`; plaintext default password. |
| `admin-app/backend/update-password.sql` | 8 | 0.3 KB | Plaintext password `UPDATE`. |
| `server/fenote_schema.sql` | 1009+ | — | Historical **PG18.4 schema-only** `pg_dump` analyzed from git HEAD; removed during fresh-only cleanup. Use `deploy/supabase/00_schema_clean.sql` instead. |

Current cleaned schema: `deploy/supabase/00_schema_clean.sql` — **26 tables** defined
as a **fresh CREATE-only schema** with **26 tables** (no `ALTER`, no `INSERT`, no data) after removing
the legacy `public.users` table for Supabase Auth. Mock data is injected only from
`deploy/local/04_mock_data_converted.sql` / `deploy/local/02_seed.sql`.

---

## 2. Dialect analysis: MySQL vs PostgreSQL

| Construct | Found | Dialect | Treatment in conversion |
| --- | --- | --- | --- |
| `CREATE DATABASE IF NOT EXISTS fenote;` / `USE fenote;` | yes (also `Fenote` in admin copy) | **MySQL-only** | Removed. PostgreSQL uses `CREATE DATABASE` / `\connect` / `SET search_path`. |
| `SERIAL PRIMARY KEY` | yes | PostgreSQL | Removed from data-only conversion; canonical schema owns DDL. |
| `JSONB`, `ON CONFLICT ... DO NOTHING` | yes | **PostgreSQL-only** | `ON CONFLICT (slug)` kept for `blog`; `form_data jsonb` kept. |
| `BOOLEAN DEFAULT FALSE`, `FALSE`/`TRUE` literals | yes | PostgreSQL | Kept as `false` / `true`. |
| `"order"` quoted identifier | yes | PostgreSQL / standard | Kept quoted; canonical table has `"order"`. |
| `NOW()`, `CURRENT_TIMESTAMP` | yes | Cross-dialect, fine in PG | Defaults handled by canonical schema. |
| `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` | yes | PostgreSQL 9.5+/9.6+ | Already present or handled by canonical schema. |
| `DROP TABLE IF EXISTS services/bookings/contact` | yes | Valid PG, but **destructive** | Removed. |
| `TEXT`, `VARCHAR`, `INT`, `TIMESTAMP` | yes | Cross-dialect | Mapped to canonical column types. |

**Conclusion:** Calling it "MySQL" is only half right. The `CREATE DATABASE IF NOT EXISTS`
and `USE` lines are MySQL; almost everything else is PostgreSQL-flavoured. Running the
file as-is on PostgreSQL fails immediately at `USE fenote;`; running it as MySQL fails
at `SERIAL`, `JSONB`, `ON CONFLICT`, `"order"`, etc. It is a hand-maintained hybrid, not
a dump from either engine.

---

## 3. Problems found

1. **Conflicting schemas.** `admin-app/backend/admin-schema.sql` makes
   `appointment_date` / `appointment_time` `NOT NULL`; the canonical dump makes them
   nullable. `server/database-schema.sql` defines `contact` with many columns, then
   immediately tries to insert into `contact(address, phone, email, hours,
   map_embed_url)` — those columns do not exist in the canonical `contact` table.
2. **Destructive statements.** `DROP TABLE IF EXISTS services`, `bookings`, `contact`
   would wipe data if run against a live DB.
3. **Case mismatch.** Mock inserts use `imageUrl`, `borderColor`, `textColor`,
   `altText`, `downloadUrl`; PostgreSQL folds unquoted identifiers to lowercase and
   the canonical schema uses `imageurl`, `bordercolor`, `textcolor`, `alttext`,
   `downloadurl`. Direct inserts would fail.
4. **Broken asset paths.** Every mock row points at `../public/uploads/download.jpg`
   and PDF names such as `anxiety-workbook.pdf`. None exist. The repo has **38 real
   committed files** under `admin-app/backend/public/uploads`, exposed as `/uploads/*`.
5. **Legacy auth table.** All four files reference `public.users` with either a bcrypt
   hash or a plaintext default password and a personal email address. Supabase Auth is
   now the only identity store; `public.users` is removed from the cleaned schema.
6. **Sensitive-looking config values.** `contact` defaults and `payment_settings`
   contain real-looking business address, phone, email and bank/Telebirr values.
   They are kept as mock/config rows only; review before any production use.
7. **No real data.** The historical `server/fenote_schema.sql` had 0
   `COPY` / `INSERT` / `setval`; it was removed during fresh-only cleanup.
   `deploy/supabase/00_schema_clean.sql` is also schema-only. The mock rows are
   **sample data**, not a `pg_dump --data-only` of production.
8. **`client` and `hero_slide` have no mock inserts** even though their tables are
   created; the converted file adds rows from the real committed client/carousel images.
9. **Duplicate `contact` insert** in `server/database-schema.sql`: one valid
   `map_embed_url` insert and one invalid insert with non-existent columns.
10. **`payment_settings` / `hero_content` / `about`** are singleton-style tables with
    no unique constraints; the conversion uses `WHERE NOT EXISTS` guards.

---

## 4. Conversion rules applied

- **Data only.** No `CREATE DATABASE`, `USE`, `CREATE TABLE`, `DROP TABLE`,
  `ALTER TABLE`, or index statements. Run after the fresh CREATE-only
  `00_schema_clean.sql`.
- **Drop `users` entirely.** No default admin password, no bcrypt hash, no personal
  email, no `reset_token` columns. Admin users live in Supabase `auth.users`.
- **Map column names** to canonical lowercase PostgreSQL columns.
- **Map asset paths** to real committed `/uploads/...` files:
  - team → 3 `/uploads/team/*.jfif`
  - blog → 3 `/uploads/blogs/*.jfif`
  - gallery → 3 `/uploads/gallery/*.jfif`
  - testimonials → 3 `/uploads/testimonials/*.jfif`
  - highlights → 3 `/uploads/highlights/*.jfif`
  - resources → 2 real PDFs + 2 real preview images (third PDF reuses a real file)
  - clients → 3 real client logos; carousel → 3 real hero images
- **Keep `"order"` quoted**, use `false`/`true` booleans, and cast `form_data` to
  `'{"source":"converted_mock"}'::jsonb` for bookings.
- **Idempotence guards:** `ON CONFLICT (slug) DO NOTHING` for `blog`;
  `WHERE NOT EXISTS` for `contact`, `hero_content`, `about`, `payment_settings`;
  a `DO` block refuses to seed if `public.team` is already non-empty.
- **Sequence sync:** `setval(pg_get_serial_sequence(...))` for all 26 tables.
- **Wrap in `begin; ... commit;`** so a failure leaves no partial seed.

---

## 5. Converted deliverable

`deploy/local/04_mock_data_converted.sql` — 168 lines, **54 mock rows across all 17
canonical tables**:

| Table | Rows | Table | Rows |
| --- | ---: | --- | ---: |
| `about` | 1 | `hero_content` | 1 |
| `blog` | 3 | `hero_slide` | 3 |
| `bookings` | 3 | `highlight` | 3 |
| `client` | 3 | `notifications` | 3 |
| `contact` | 1 | `payment_packages` | 8 |
| `gallery` | 3 | `payment_settings` | 1 |
| `resource` | 3 | `services` | 9 |
| `team` | 3 | `team_members` | 3 |
| `testimonial` | 3 | | |

`scripts/setup-local-db.sh` now uses this converted file by default. Override with:

```bash
SEED_FILE=deploy/local/02_seed.sql bash scripts/setup-local-db.sh
```

`deploy/local/02_seed.sql` remains as a smaller hand-written sample seed.

---

## 6. Local validation (2026-11-03)

- Reinstalled PostgreSQL 17.11 and `npm ci` in all 4 packages (sandbox snapshots do
  not persist installed packages / `node_modules`).
- `scripts/setup-local-db.sh` dropped/recreated `fenote_db`, applied the fresh
  CREATE-only `00_schema_clean.sql` (26 tables, 0 `ALTER`), `04_mock_data_converted.sql`
  (54 rows), and `01_rls.sql` — **exit 0, no SQL errors**.
- Row counts matched the table above; `contact.full_address` correctly contains the
  converted newline.
- `scripts/test-local-rls.sh` passed: anon reads public content, anon cannot read
  `bookings`/`notifications`, anon direct booking insert is denied, `service_role` reads private tables,
  0 tables lack RLS, `to_regclass('public.users')` is NULL.
- The converted file contains no default admin credential, no bcrypt hash, no
  `JWT_SECRET`, no Resend key, no secret key, and no `public.users` insert.

---

## 7. What this does **not** solve

- It is still **mock data**, not the "real data from the schema" you asked about
  earlier in the sense of production rows. The committed canonical dump is
  schema-only. To import real rows, supply `pg_dump --data-only` and use
  `scripts/export-local-data.sh`; see `deploy/local/README.md`.
- It does not re-add the legacy `users` table. Supabase Auth remains the identity
  provider; create the admin user in the Supabase dashboard.
- It does not deploy anything. Cloudflare-first configs remain templates; no GitHub
  push, no remote migration.
- It does not fix the upstream legacy SQL files in `HEAD`; they were deleted from
  this patch on purpose. This analysis and the converted seed are the replacement.

---

## 8. Related files

- `deploy/local/04_mock_data_converted.sql` — converted PG17 seed.
- `deploy/local/02_seed.sql` — smaller alternative sample seed.
- `deploy/local/README.md` — local PostgreSQL + Auth runbook.
- `deploy/supabase/00_schema_clean.sql` — canonical fresh CREATE-only PG17/Supabase schema (26 tables, no `ALTER`, no data).
- `deploy/supabase/02_auth_migration.md` — full Supabase Auth status.
- `/home/user/fenote-cloudflare-auth.patch` — final local patch delivered with the project.
