#!/usr/bin/env bash
# Export REAL data only (no schema) from the user's local/production Postgres.
# The committed schema is fresh CREATE-only and data-free; deploy/local/04_mock_data_converted.sql
# is converted mock data, NOT production data. See MYSQL_MOCK_DATA_ANALYSIS.md.
# Review the output before importing anywhere: bookings contain patient data.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/deploy/local/real-data.sql}"

: "${DATABASE_URL:?Set DATABASE_URL to the source database}"
# Never export the legacy custom-auth table; admins live in Supabase Auth.
pg_dump "$DATABASE_URL" \
  --data-only --no-owner --no-acl --no-comments \
  --schema=public \
  --exclude-table=public.users \
  --file "$OUT"

echo "Wrote $OUT"
echo "Import with:"
echo "  psql \"\$TARGET_DATABASE_URL\" -v ON_ERROR_STOP=1 -f $OUT"
echo "Then re-run deploy/supabase/01_rls.sql on the target."
