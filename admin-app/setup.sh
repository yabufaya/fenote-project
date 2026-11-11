#!/usr/bin/env bash
# Superseded legacy setup script. It used to create .env files with
# JWT_SECRET / EMAIL_PASSWORD and a hardcoded default admin user. Do not use it.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Legacy setup is disabled. Use the supported local runbook:"
echo "  bash $ROOT/scripts/setup-local-db.sh"
echo "  bash $ROOT/scripts/test-local-rls.sh"
echo "  $ROOT/deploy/local/README.md"
echo "  $ROOT/deploy/supabase/02_auth_migration.md"
