#!/usr/bin/env bash
# WP 3.2b gate (patient UI) on this package's own ports: API 4032, web 3032, database carepath_wp32_<pid>.
# Migrates and seeds its own database, lints, formats and type-checks only the patient paths, builds the
# web app, then starts the API and `next start` and runs the patient Playwright specs (Scenarios A and C at
# 390 by 844, a 1440 smoke, keyboard-only pass, axe, 200 percent zoom, reload resume).
# Screenshots of every patient screen go to docs/screenshots/3.2b/. Never stops the shared cluster.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck source=scripts/gate-env.sh
source scripts/gate-env.sh wp32 4032 3032 || exit 1
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

PATIENT_PATHS=("apps/web/app/(patient)" apps/web/e2e/patient.spec.ts apps/web/e2e/patient-helpers.ts)

run pnpm db:migrate
run pnpm db:seed --profile small
echo; echo "==> type-check (patient paths only; other workers' files are not this gate's)"
tsc_out=$(pnpm --filter @carepath/web exec tsc -p tsconfig.json --noEmit 2>&1)
echo "$tsc_out" | tail -n 20
if echo "$tsc_out" | grep -E "app/\(patient\)|e2e/patient" >/dev/null; then echo "FAILED: type errors in patient paths" >&2; exit 1; fi
run pnpm exec eslint "${PATIENT_PATHS[@]}"
run pnpm exec prettier --check "${PATIENT_PATHS[@]}"

export CAREPATH_FIXED_NOW="${CAREPATH_FIXED_NOW:-2026-11-19T16:00:00.000Z}"
export PLAYWRIGHT_CHROME_PATH="${PLAYWRIGHT_CHROME_PATH:-/usr/bin/google-chrome}"
export SCREENSHOT_DIR="${SCREENSHOT_DIR:-$PWD/docs/screenshots/3.2b}"
mkdir -p "$SCREENSHOT_DIR"
LOGS=".data/e2e-${API_PORT}"; mkdir -p "$LOGS"

stage() { # build and end-to-end under ONE hold of the web lock, so no other worker rebuilds .next in between
  echo; echo "==> web build (API_PORT=${API_PORT})"
  pnpm --filter @carepath/web build || { echo "FAILED: web build" >&2; return 1; }
  PIDS=()
  stop_servers() {
    for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill -- "-$pid" 2>/dev/null; done
    sleep 0.5
    for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill -9 -- "-$pid" 2>/dev/null; done
    return 0
  }
  trap stop_servers EXIT
  wait_for() {
    for _ in $(seq 1 90); do curl -fsS -o /dev/null "$1" 2>/dev/null && return 0; sleep 1; done
    echo "gate: $2 did not become ready at $1" >&2; tail -n 30 "$3" >&2; return 1
  }
  setsid env API_HOST=127.0.0.1 TRUST_PROXY=loopback RATE_LIMIT_LOGIN_PER_MINUTE=500 RATE_LIMIT_GLOBAL_PER_MINUTE=6000 \
    bash -c 'cd apps/api && exec ./node_modules/.bin/tsx src/server.ts' >"$LOGS/api.log" 2>&1 &
  PIDS+=("$!")
  wait_for "http://127.0.0.1:${API_PORT}/health" API "$LOGS/api.log" || return 1
  setsid bash -c 'cd apps/web && exec node node_modules/next/dist/bin/next start -p "$WEB_PORT" -H 127.0.0.1' \
    >"$LOGS/web.log" 2>&1 &
  PIDS+=("$!")
  wait_for "http://127.0.0.1:${WEB_PORT}/login" web "$LOGS/web.log" || return 1
  pnpm --filter @carepath/web exec playwright test --config e2e/playwright.config.ts patient.spec
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "gate: Playwright failed; API log tail:" >&2; tail -n 15 "$LOGS/api.log" >&2
    echo "gate: web log tail:" >&2; tail -n 15 "$LOGS/web.log" >&2
  fi
  return "$status"
}
echo; echo "==> end-to-end (patient specs)"
export -f stage
export LOGS
scripts/with-web-lock.sh bash -c 'stage' || { echo "FAILED: end-to-end" >&2; exit 1; }
echo; echo "WP 3.2b gate: PASSED"
