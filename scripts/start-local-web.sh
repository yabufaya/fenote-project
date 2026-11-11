#!/usr/bin/env bash
# Local web + hosted Supabase. Starts the four web/API units on this machine.
# PostgreSQL / Auth / Storage / Realtime come from hosted Supabase.
# NO local PostgreSQL process is started by this script.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
bash scripts/setup-local-all-env.sh

pids=()
cleanup() {
  echo "Stopping local web services..."
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

npm --prefix server start & pids+=($!)
npm --prefix admin-app/backend start & pids+=($!)
npm --prefix fenote-app run dev & pids+=($!)
npm --prefix admin-app/frontend run dev & pids+=($!)

echo "Public SPA:  http://localhost:3000"
echo "Admin SPA:   http://localhost:5174"
echo "Public API:  http://localhost:5000/health"
echo "Admin API:   http://localhost:5001/health"
echo "Data / Auth / Storage / Realtime: hosted Supabase (no local DB)."
echo "Press Ctrl+C to stop all four."
wait || true
