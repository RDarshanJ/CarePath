#!/usr/bin/env bash
# Design capture (rebuild plan section 2, G5 and G8): a fresh database seeded with the small profile, a web
# build for the given API port, the API with CAREPATH_FIXED_NOW at the seed anchor, `next start`, then
# apps/web/scripts/design-capture.mjs, which writes `<screen>-<width>.png` and `_probe.json` to CAPTURE_DIR
# with the same file names as docs/design/baseline/.
#
# Usage (always under the web lock, which this script does not take itself):
#   CAPTURE_DIR=docs/design/after/<wp> scripts/with-web-lock.sh scripts/design-capture.sh <name> <api_port> <web_port>
# Optional: SCREENS, WIDTHS, PROBE_FAIL_ON (see the .mjs header); CAPTURE_SKIP_BUILD=1 reuses apps/web/.next
# (only when it was built for the same API port).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
if [ "$#" -lt 3 ] || [ -z "${CAPTURE_DIR:-}" ]; then
  echo "usage: CAPTURE_DIR=<dir> scripts/with-web-lock.sh scripts/design-capture.sh <name> <api_port> <web_port>" >&2
  exit 2
fi
CAPTURE_DIR="$(mkdir -p "$CAPTURE_DIR" && cd "$CAPTURE_DIR" && pwd)"
export CAPTURE_DIR
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh "$1" "$2" "$3" || exit 1
export CAREPATH_FIXED_NOW="${CAREPATH_FIXED_NOW:-2026-11-19T16:00:00.000Z}"
export PLAYWRIGHT_CHROME_PATH="${PLAYWRIGHT_CHROME_PATH:-/usr/bin/google-chrome}"
LOGS=".data/design-capture-${API_PORT}"
mkdir -p "$LOGS"

PIDS=()
stop_servers() {
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill -- "-$pid" 2>/dev/null; done
  sleep 0.5
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill -9 -- "-$pid" 2>/dev/null; done
  PIDS=()
  return 0
}
trap 'stop_servers; scripts/db.sh drop >/dev/null 2>&1 || true; scripts/db.sh release || true' EXIT
wait_for() { # url, name, log
  for _ in $(seq 1 90); do
    curl -fsS -o /dev/null "$1" 2>/dev/null && return 0
    sleep 1
  done
  echo "design-capture: $2 did not become ready at $1" >&2
  tail -n 30 "$3" >&2
  return 1
}
step() { echo "==> $1"; shift; "$@" >"$LOGS/$STEPLOG.log" 2>&1 || { tail -n 30 "$LOGS/$STEPLOG.log" >&2; echo "FAILED: $*" >&2; exit 1; }; }

STEPLOG=migrate step "migrate ($CAREPATH_DB)" pnpm db:migrate
STEPLOG=seed step "seed (small profile)" pnpm db:seed --profile small
if [ -z "${CAPTURE_SKIP_BUILD:-}" ]; then
  STEPLOG=build step "web build (API_PORT=$API_PORT)" pnpm --filter @carepath/web build
fi

setsid env API_HOST=127.0.0.1 TRUST_PROXY=loopback RATE_LIMIT_LOGIN_PER_MINUTE=500 \
  bash -c 'cd apps/api && exec ./node_modules/.bin/tsx src/server.ts' >"$LOGS/api.log" 2>&1 &
PIDS+=("$!")
wait_for "http://127.0.0.1:${API_PORT}/health" API "$LOGS/api.log" || exit 1
setsid bash -c 'cd apps/web && exec node node_modules/next/dist/bin/next start -p "$WEB_PORT" -H 127.0.0.1' \
  >"$LOGS/web.log" 2>&1 &
PIDS+=("$!")
wait_for "http://127.0.0.1:${WEB_PORT}/login" web "$LOGS/web.log" || exit 1

echo "==> capture to $CAPTURE_DIR"
(cd apps/web && node scripts/design-capture.mjs)
