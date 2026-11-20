#!/usr/bin/env bash
# End-to-end stage (WP 3.2a): starts the API and `next start` on the gate's ports against the gate's
# seeded database, runs Playwright (system Chrome) with axe, then stops both servers.
#
# Needs the gate environment (source scripts/gate-env.sh <name> <api_port> <web_port>) and a web build made
# with the same API_PORT (the /api rewrite is fixed at build time). Run it under the web lock:
#   scripts/with-web-lock.sh scripts/e2e.sh
# The API clock is fixed to the seed anchor (checkpoint C1, ruling 3.8) and the browser clock is set to
# the same instant by the tests. Never run `next dev`; never use ports 3000 or 4000.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

: "${API_PORT:?run through scripts/gate-env.sh}" "${WEB_PORT:?run through scripts/gate-env.sh}" "${DATABASE_URL:?}"
export CAREPATH_FIXED_NOW="${CAREPATH_FIXED_NOW:-2026-11-19T16:00:00.000Z}"
export PLAYWRIGHT_CHROME_PATH="${PLAYWRIGHT_CHROME_PATH:-/usr/bin/google-chrome}"
LOGS=".data/e2e-${API_PORT}"
mkdir -p "$LOGS"

PIDS=()
stop_servers() {
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill -- "-$pid" 2>/dev/null
  done
  sleep 0.5
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill -9 -- "-$pid" 2>/dev/null
  done
  return 0
}
trap stop_servers EXIT

wait_for() { # url, name, log
  for _ in $(seq 1 90); do
    if curl -fsS -o /dev/null "$1" 2>/dev/null; then return 0; fi
    sleep 1
  done
  echo "e2e: $2 did not become ready at $1; last log lines:" >&2
  tail -n 30 "$3" >&2
  return 1
}

# The API behind the rewrite: trusts X-Forwarded-For from loopback only. The login limit is raised
# because the suite signs in dozens of times from one address in a minute (default 10).
# Each server starts in its own session (setsid), so one kill of the group stops tsx or next and its children.
setsid env API_HOST=127.0.0.1 TRUST_PROXY=loopback RATE_LIMIT_LOGIN_PER_MINUTE=500 \
  bash -c 'cd apps/api && exec ./node_modules/.bin/tsx src/server.ts' >"$LOGS/api.log" 2>&1 &
PIDS+=("$!")
wait_for "http://127.0.0.1:${API_PORT}/health" "API" "$LOGS/api.log" || exit 1

setsid bash -c 'cd apps/web && exec node node_modules/next/dist/bin/next start -p "$WEB_PORT" -H 127.0.0.1' \
  >"$LOGS/web.log" 2>&1 &
PIDS+=("$!")
wait_for "http://127.0.0.1:${WEB_PORT}/login" "web" "$LOGS/web.log" || exit 1

pnpm --filter @carepath/web e2e
status=$?
if [ "$status" -ne 0 ]; then
  echo "e2e: Playwright failed; API log tail:" >&2; tail -n 15 "$LOGS/api.log" >&2
  echo "e2e: web log tail:" >&2; tail -n 15 "$LOGS/web.log" >&2
fi
exit "$status"
