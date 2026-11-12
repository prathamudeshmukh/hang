#!/usr/bin/env bash
# Slice 9 E2E: share from Chrome → synced → uninstall → reinstall → sign in → still there.
#
#   e2e/run.sh emulator [--skip-build]
#   e2e/run.sh phone --i-know [--skip-build]
#
# Needs HANG_E2E_ACCOUNT (the test Google account's email, already added to the device).
# HANG_E2E_SERIAL overrides the adb serial picked for the device.
set -euo pipefail

readonly PACKAGE=com.prathamesh.hang
readonly APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
readonly FLOWS="$APP_DIR/e2e/flows"
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

build_apk() {
  (cd "$APP_DIR/android" && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a -q)
}

# Screen timeouts lock the device mid-flow; keep it awake while plugged in, then put the setting back.
keep_awake() {
  local previous
  previous="$(adb -s "$SERIAL" shell settings get global stay_on_while_plugged_in | tr -d '\r')"
  trap 'adb -s "$SERIAL" shell settings put global stay_on_while_plugged_in "'"$previous"'"' EXIT
  adb -s "$SERIAL" shell svc power stayon true
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

run_flow() {
  echo "e2e: $1"
  maestro --device "$SERIAL" test "$FLOWS/$1" \
    -e URL="$URL" -e URL_PATTERN="$URL_PATTERN" -e ACCOUNT="$HANG_E2E_ACCOUNT" -e DEVICE="$DEVICE"
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
echo "e2e: $DEVICE ($SERIAL), $URL"

[[ "$SKIP_BUILD" == true ]] || build_apk
[[ -f "$APK" ]] || fail "no release APK at $APK"

require_unlocked
keep_awake
reinstall
run_flow 01-share.yaml
reinstall
run_flow 02-after-reinstall.yaml
if [[ "$DEVICE" == phone ]]; then
  run_flow 03-sign-out.yaml
fi
echo "e2e: passed ($URL)"
