#!/bin/sh
# Runs *.integration.ts against the local stack (`npx supabase start` first).
# Points local Vault at the locally served `extract` and `media` and gives both the same throwaway secret,
# kept in supabase/functions/.env (gitignored; created on first run).
set -eu
cd "$(dirname "$0")/.."

ENV_FILE=.env
DB_CONTAINER=supabase_db_hang
LOCAL_FUNCTION_URL=http://supabase_kong_hang:8000/functions/v1/extract
LOCAL_MEDIA_URL=http://supabase_kong_hang:8000/functions/v1/media
SERVE_LOG="${TMPDIR:-/tmp}/hang-functions-serve.log"

grep -q '^EXTRACT_SECRET=' "$ENV_FILE" 2>/dev/null || echo "EXTRACT_SECRET=$(openssl rand -hex 32)" >> "$ENV_FILE"
EXTRACT_SECRET=$(sed -n 's/^EXTRACT_SECRET=//p' "$ENV_FILE")

docker exec -i "$DB_CONTAINER" psql -q -U postgres -v ON_ERROR_STOP=1 \
  -v url="$LOCAL_FUNCTION_URL" -v media_url="$LOCAL_MEDIA_URL" -v secret="$EXTRACT_SECRET" < scripts/configure-vault.sql > /dev/null

npx supabase functions serve --env-file "$ENV_FILE" > "$SERVE_LOG" 2>&1 &
SERVE_PID=$!
# `functions serve` replaces the stack's edge runtime container; nothing else needs it. To have the
# stack serve functions again: `npx supabase stop && npx supabase start`.
trap 'kill $SERVE_PID 2>/dev/null || true' EXIT

STATUS_ENV=$(npx supabase status -o env)
API_URL=$(echo "$STATUS_ENV" | sed -n 's/^API_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')
SERVICE_ROLE_KEY=$(echo "$STATUS_ENV" | sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')
export API_URL SERVICE_ROLE_KEY EXTRACT_SECRET

# Wait for the function to answer (405 on GET means it's up).
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/functions/v1/extract" || true)
  [ "$code" = "405" ] && break
  sleep 1
done

deno test --allow-env --allow-net --allow-read=. '**/*.integration.ts'
