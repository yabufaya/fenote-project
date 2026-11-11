#!/usr/bin/env bash
# Build BOTH Vite SPAs into ONE Cloudflare Workers Static Assets directory.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Install all four package-lock dependency sets for Wrangler bundling.
bash scripts/install-all.sh

# Derive Vite build-time variables from root wrangler.jsonc. Workers Builds
# exposes config [vars] to the Worker at runtime, NOT to `npm run build`, so the
# admin SPA would otherwise throw "Missing VITE_SUPABASE_URL...". Explicit
# Cloudflare Build variables with the same names still take precedence.
eval "$(node scripts/vite-env-from-wrangler.mjs)"

rm -rf cloudflare-dist
mkdir -p cloudflare-dist/admin

# Public SPA at / and /api.
(
  cd fenote-app
  VITE_API_URL=/api npm run build -- --outDir ../cloudflare-dist --emptyOutDir
)

# Admin SPA at /admin/ and /api/admin.
(
  cd admin-app/frontend
  VITE_API_URL=/api/admin \
  VITE_BASE_PATH=/admin/ \
  npm run build -- --outDir ../../cloudflare-dist/admin --emptyOutDir
)

printf '\nOne-app build complete: %s/cloudflare-dist\n' "$ROOT"
printf '  /              -> public SPA\n'
printf '  /admin         -> admin SPA\n'
printf '  /api/*         -> public API\n'
printf '  /api/admin/*   -> admin API\n'
