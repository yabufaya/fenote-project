#!/usr/bin/env bash
# Create the single repo-root env file used by all four local web units.
# Default template targets HOSTED SUPABASE; no local PostgreSQL.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [ ! -f .env.local ]; then
  cp deploy/.env.example.local-all .env.local
  echo "Created $ROOT/.env.local (hosted Supabase template)"
else
  echo "Keeping existing $ROOT/.env.local"
  if grep -q 'SANDBOX PREVIEW ONLY' .env.local; then
    echo "WARNING: this is the ignored Arena preview env, NOT the hosted template." >&2
    echo "Overwrite it once with: cp deploy/.env.example.local-all .env.local" >&2
    echo "Then set DATABASE_SSL=true and remove any DATABASE_SSL=false line." >&2
  fi
fi
echo "Edit only this file for local runs, then restart the four services."
echo "Default run: bash scripts/start-local-web.sh"
echo "Do NOT run setup-local-db.sh / test-local-rls.sh in hosted-Supabase mode."
echo "Optional local PG17 template: deploy/.env.example.local-pg17"
