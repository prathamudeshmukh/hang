#!/bin/sh
# Runs src/**/*.integration.ts against the local Supabase stack (`npx supabase start` first).
set -eu
cd "$(dirname "$0")/.."
env_lines=$(npx supabase status -o env --workdir .. 2>/dev/null | grep -E '^(API_URL|ANON_KEY)=') || {
  echo "Local Supabase isn't running: npx supabase start" >&2
  exit 1
}
eval "export $(echo "$env_lines" | tr '\n' ' ')"
exec node --test 'src/**/*.integration.ts'
