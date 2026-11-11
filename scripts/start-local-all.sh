#!/usr/bin/env bash
# Backwards-compatible alias for the default local web + hosted Supabase mode.
exec bash "$(dirname "${BASH_SOURCE[0]}")/start-local-web.sh"
