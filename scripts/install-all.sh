#!/usr/bin/env bash
# Install npm dependencies for all four local web/API units from their
# committed package-lock.json files. Run once after downloading the ZIP or
# applying the patch, before scripts/setup-local-all-env.sh / start-local-web.sh.
#
# Usage (from anywhere):
#   bash /path/to/psychiatrist/scripts/install-all.sh
#
# Uses `npm ci --include=dev` so Vite/devDependencies are installed even if
# the calling shell happens to have NODE_ENV=production. `npm ci` is
# deterministic and respects the pinned @supabase/supabase-js@2.109.0.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: Node.js and npm are required (Node 20+ recommended)." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
NPM_MAJOR="$(npm -v | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 20 ] || [ "$NPM_MAJOR" -lt 9 ]; then
  echo "ERROR: Node 20+ and npm 9+ are required. Found Node $(node -v), npm $(npm -v)." >&2
  exit 1
fi

echo "Node $(node -v), npm $(npm -v)"
echo "Project root: $ROOT"

PACKAGES=(
  "server"
  "admin-app/backend"
  "fenote-app"
  "admin-app/frontend"
)

for pkg in "${PACKAGES[@]}"; do
  if [ ! -f "$pkg/package.json" ]; then
    echo "ERROR: missing $pkg/package.json" >&2
    exit 1
  fi
  echo
  echo "==> Installing dependencies in $pkg"
  if [ -f "$pkg/package-lock.json" ]; then
    npm --prefix "$pkg" ci --include=dev --no-audit --no-fund
  else
    echo "    No package-lock.json; falling back to npm install."
    npm --prefix "$pkg" install --include=dev --no-audit --no-fund
  fi
done

cat <<'EOF'

All four npm installs are complete.

Next steps (hosted Supabase, no local PostgreSQL):
  bash scripts/setup-local-all-env.sh   # creates root .env.local if absent
  # edit root .env.local with your hosted Supabase values
  bash scripts/start-local-web.sh       # starts 3000 / 5000 / 5001 / 5174

Do not run setup-local-db.sh or test-local-rls.sh in hosted-Supabase mode.
EOF
