#!/usr/bin/env bash
# Local-only PostgreSQL test. DESTRUCTIVE: drops and recreates fenote_db.
# Run from anywhere: bash /home/user/psychiatrist/scripts/setup-local-db.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="${DB_NAME:-fenote_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-localtest}"
CLUSTER="${CLUSTER:-17/main}"
# The schema file is CREATE-only and data-free. Mock data is injected from a
# separate file. Default to the converted legacy mock data; override with the
# smaller hand-written sample seed: SEED_FILE=deploy/local/02_seed.sql.
SEED_FILE="${SEED_FILE:-$ROOT/deploy/local/04_mock_data_converted.sql}"
case "$SEED_FILE" in /*) ;; *) SEED_FILE="$ROOT/$SEED_FILE" ;; esac

echo "== Local PostgreSQL test =="
echo "   repo:    $ROOT"
echo "   database: $DB_NAME (will be dropped and recreated)"
echo "   user:     $DB_USER / local-only password"

if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo "pg_ctlcluster not found. Install PostgreSQL first, e.g.:" >&2
  echo "  sudo apt-get update && sudo apt-get install -y postgresql postgresql-client" >&2
  exit 1
fi
if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "Starting PostgreSQL cluster $CLUSTER ..."
  sudo pg_ctlcluster ${CLUSTER%/*} ${CLUSTER#*/} start
fi
pg_isready -h localhost -p 5432

# Supabase Realtime publications need logical WAL locally. Set once, then restart
# the cluster if it is not already logical (idempotent; local sandbox only).
CONF="$(sudo -u postgres psql -tAc "show config_file;" | xargs)"
if ! grep -q "^wal_level = logical" "$CONF"; then
  sudo sed -i 's/^#wal_level = replica/wal_level = logical/' "$CONF"
  sudo pg_ctlcluster ${CLUSTER%/*} ${CLUSTER#*/} restart
  pg_isready -h localhost -p 5432 >/dev/null
fi

# The local .env files use DB_PASS=localtest; this is NOT a production secret.
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='${DB_NAME}' and pid <> pg_backend_pid();"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${DB_NAME};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

export PGPASSWORD="${DB_PASS}"
PSQL=(psql -h localhost -p 5432 -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 --no-psqlrc)

echo "== 1/6 fresh CREATE-only schema (no ALTER, no data, no public.users) =="
"${PSQL[@]}" -f "$ROOT/deploy/supabase/00_schema_clean.sql" >/tmp/fenote_schema.log
echo "   $(grep -c '^CREATE TABLE' "$ROOT/deploy/supabase/00_schema_clean.sql") tables defined"

echo "== 2/6 seed: $(basename "$SEED_FILE") (MOCK data, NOT a production dump) =="
"${PSQL[@]}" -f "$SEED_FILE" >/tmp/fenote_seed.log

echo "== 3/6 local Supabase compatibility shims =="
"${PSQL[@]}" -f "$ROOT/deploy/local/05_supabase_compat.sql" >/tmp/fenote_compat.log

echo "== 4/6 RLS + DB-backed admin roles =="
"${PSQL[@]}" -f "$ROOT/deploy/supabase/01_rls.sql" >/tmp/fenote_rls.log

echo "== 5/6 Storage buckets + superadmin bootstrap =="
"${PSQL[@]}" -f "$ROOT/deploy/supabase/04_storage_and_admin_bootstrap.sql" >/tmp/fenote_storage.log

echo "== 6/6 table / row counts =="
"${PSQL[@]}" -c "select count(*) as tables from pg_tables where schemaname='public';"
"${PSQL[@]}" -c "select 'blog' as t, count(*) from public.blog union all select 'bookings', count(*) from public.bookings union all select 'notifications', count(*) from public.notifications union all select 'services', count(*) from public.services;"

echo
echo "Local DB ready. Run: bash $ROOT/scripts/test-local-rls.sh"
echo "DATABASE_URL for .env: postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
