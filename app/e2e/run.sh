#!/usr/bin/env bash
# Slice 9 E2E: share from Chrome while signed out → sign-in counts it → signed in, claimed → synced → uninstall → reinstall → sign in → still there → opens in the feed
# → Rediscover has a pick once an item is backdated. First, if HANG_E2E_EMPTY_ACCOUNT is set: a fresh install
# signed in as an account that stays empty shows the how-to (#75).
#
#   e2e/run.sh emulator [--skip-build]
#   e2e/run.sh phone --i-know [--skip-build]
#
# Needs HANG_E2E_ACCOUNT (the test Google account's email, already added to the device).
# HANG_E2E_EMPTY_ACCOUNT (optional): a second test account, also on the device, that never saves anything.
# HANG_E2E_SERIAL overrides the adb serial picked for the device.
# On exit, pass or fail, the run's link and collection are soft-deleted from the hosted project (needs the Supabase CLI
# logged in and linked; it writes to production). HANG_E2E_KEEP_DATA=1 leaves them, to look into a failure.
set -euo pipefail

readonly PACKAGE=com.prathamesh.hang
readonly APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly FLOWS="$APP_DIR/e2e/flows"
readonly REPO_DIR="$(cd "$APP_DIR/.." && pwd)"
readonly APK="$APP_DIR/android/app/build/outputs/apk/release/app-release.apk"
readonly PHONE_WARNING="This uninstalls Hang from your phone. Anything not yet synced is lost.
Open Hang first and check nothing says 'waiting to sync'.
Afterwards, sign back in as yourself; sync brings your data back.
Re-run with --i-know to go ahead."

export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
export PATH="$PATH:$HOME/.maestro/bin"

fail() { echo "e2e: $*" >&2; exit 1; }

pick_serial() {
  local devices
  devices="$(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')"
  case "$1" in
    emulator) grep '^emulator-' <<<"$devices" | head -1 ;;
    phone) grep -v '^emulator-' <<<"$devices" | head -1 ;;
  esac
}

# Dev tools on: the Rediscover flow backdates an item through hang://dev/rediscover (#34).
build_apk() {
  (cd "$APP_DIR/android" && EXPO_PUBLIC_HANG_DEV_TOOLS=1 ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a -q)
}

# Screen timeouts lock the device mid-flow; keep it awake while plugged in, then put the setting back (on_exit).
keep_awake() {
  STAY_ON_BEFORE="$(adb -s "$SERIAL" shell settings get global stay_on_while_plugged_in | tr -d '\r')"
  adb -s "$SERIAL" shell svc power stayon true
}

restore_stay_on() {
  [[ -n "${STAY_ON_BEFORE:-}" ]] || return 0
  adb -s "$SERIAL" shell settings put global stay_on_while_plugged_in "$STAY_ON_BEFORE" || true
}

# A SQL string literal: single quotes doubled.
sql_text() {
  local quote="'"
  printf "'%s'" "${1//$quote/$quote$quote}"
}

# Soft-deletes only this run's link and + New collection on the test account, so a device signed in to it drops them
# on its next sync. Never fails the run: a failed clean-up warns and leaves the rows.
clean_up() {
  if [[ "${HANG_E2E_KEEP_DATA:-}" == 1 ]]; then
    echo "e2e: keeping this run's data ($URL, collection $ROOM)"
    return 0
  fi
  local owner="(select id from auth.users where email = $(sql_text "$HANG_E2E_ACCOUNT"))"
  local sql="with items as (update public.items set deleted_at = now()
      where user_id = $owner and deleted_at is null and source_url = $(sql_text "$URL") returning 1),
    rooms as (update public.collections set deleted_at = now()
      where user_id = $owner and deleted_at is null and name = $(sql_text "$ROOM") returning 1)
    select (select count(*) from items) as items, (select count(*) from rooms) as collections"
  echo "e2e: cleaning up this run's data"
  npx --yes supabase db query --workdir "$REPO_DIR" --remote --yes -o csv "$sql" \
    || echo "e2e: clean-up failed; remove $URL and collection '$ROOM' by hand" >&2
}

on_exit() {
  restore_stay_on
  clean_up
}

require_unlocked() {
  adb -s "$SERIAL" shell input keyevent KEYCODE_WAKEUP
  if adb -s "$SERIAL" shell dumpsys window | grep -q 'isKeyguardShowing=true'; then
    fail "$DEVICE is locked: unlock it and keep the screen on (a long screen timeout helps)"
  fi
}

reinstall() {
  adb -s "$SERIAL" uninstall "$PACKAGE" >/dev/null 2>&1 || true
  adb -s "$SERIAL" install "$APK" >/dev/null
}

# run_flow <flow> [account]: the account defaults to HANG_E2E_ACCOUNT.
run_flow() {
  echo "e2e: $1"
  maestro --device "$SERIAL" test "$FLOWS/$1" \
    -e URL="$URL" -e URL_PATTERN="$URL_PATTERN" -e ACCOUNT="${2:-$HANG_E2E_ACCOUNT}" -e DEVICE="$DEVICE" -e ROOM="$ROOM"
}

# Its account must stay empty: nothing in this run saves as it.
run_empty_home() {
  if [[ -z "${HANG_E2E_EMPTY_ACCOUNT:-}" ]]; then
    echo "e2e: skipping 00-empty-home.yaml (set HANG_E2E_EMPTY_ACCOUNT to run it)"
    return
  fi
  reinstall
  run_flow 00-empty-home.yaml "$HANG_E2E_EMPTY_ACCOUNT"
}

DEVICE="${1:-}"
shift || true
CONFIRMED=false
SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --i-know) CONFIRMED=true ;;
    --skip-build) SKIP_BUILD=true ;;
    *) fail "unknown option $arg" ;;
  esac
done

[[ "$DEVICE" == emulator || "$DEVICE" == phone ]] || fail "usage: e2e/run.sh emulator|phone [--i-know] [--skip-build]"
if [[ "$DEVICE" == phone && "$CONFIRMED" != true ]]; then
  echo "$PHONE_WARNING" >&2
  exit 1
fi
[[ -n "${HANG_E2E_ACCOUNT:-}" ]] || fail "set HANG_E2E_ACCOUNT to the test Google account's email"
command -v maestro >/dev/null || fail "maestro not found (see CLAUDE.md, E2E commands)"

SERIAL="${HANG_E2E_SERIAL:-$(pick_serial "$DEVICE")}"
[[ -n "$SERIAL" ]] || fail "no $DEVICE found in adb devices"

RUN_ID="$(date +%s)"
URL="https://example.com/?e2e=$RUN_ID"
URL_PATTERN="item:https://example\\.com/\\?e2e=$RUN_ID"
# + New makes a collection per run (#76); names must be unique. clean_up removes it with the link.
ROOM="E2E $RUN_ID"
echo "e2e: $DEVICE ($SERIAL), $URL"
trap on_exit EXIT

[[ "$SKIP_BUILD" == true ]] || build_apk
[[ -f "$APK" ]] || fail "no release APK at $APK"

require_unlocked
keep_awake
run_empty_home
reinstall
run_flow 01-share.yaml
reinstall
run_flow 02-after-reinstall.yaml
if [[ "$DEVICE" == phone ]]; then
  run_flow 03-sign-out.yaml
fi
echo "e2e: passed ($URL)"
