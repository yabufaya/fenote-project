#!/usr/bin/env bash
# Verify RLS / no anonymous private writes / legacy users removal on the local DB.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="${DB_NAME:-fenote_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-localtest}"

export PGPASSWORD="${DB_PASS}"
psql -h localhost -p 5432 -U "${DB_USER}" -d "${DB_NAME}" \
  -v ON_ERROR_STOP=1 --no-psqlrc \
  -f "$ROOT/deploy/local/03_test_rls.sql"
psql -h localhost -p 5432 -U "${DB_USER}" -d "${DB_NAME}" \
  -v ON_ERROR_STOP=1 --no-psqlrc \
  -f "$ROOT/deploy/local/06_test_admin_storage.sql"
