#!/usr/bin/env bash
# End-to-end stage (WP 3.2a): starts the API and `next start` on the gate's ports against the gate's
# seeded database, runs Playwright (system Chrome) with axe, then stops both servers.
#
# Needs the gate environment (source scripts/gate-env.sh <name> <api_port> <web_port>) and a web build made
# with the same API_PORT (the /api rewrite is fixed at build time). Run it under the web lock:
#   scripts/with-web-lock.sh scripts/e2e.sh
# The API clock is fixed to the seed anchor (checkpoint C1, ruling 3.8) and the browser clock is set to
# the same instant by the tests. Never run `next dev`; never use ports 3000 or 4000.
#
# The stage fails if it changed anything under docs/ (checkpoint C2, F5): a gate must never dirty the tree.
# The one exception is an explicit SCREENSHOT_DIR inside docs/ (a work package gate that records
# screenshots on purpose); changes inside that directory are allowed, changes anywhere else are not.
# Without SCREENSHOT_DIR, screenshots go to a scratch directory in this worktree's .data/.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

: "${API_PORT:?run through scripts/gate-env.sh}" "${WEB_PORT:?run through scripts/gate-env.sh}" "${DATABASE_URL:?}"
export CAREPATH_FIXED_NOW="${CAREPATH_FIXED_NOW:-2026-11-19T16:00:00.000Z}"
export PLAYWRIGHT_CHROME_PATH="${PLAYWRIGHT_CHROME_PATH:-/usr/bin/google-chrome}"
# Logs stay in this worktree; only the cluster, leases and web lock are shared (scripts/data-root.sh).
LOGS=".data/e2e-${API_PORT}"
mkdir -p "$LOGS"
if [ -z "${SCREENSHOT_DIR:-}" ]; then
  export SCREENSHOT_DIR="$PWD/.data/e2e-screenshots"
fi
mkdir -p "$SCREENSHOT_DIR"

# Fingerprint of docs/ outside SCREENSHOT_DIR: status, tracked diff and untracked file contents.
docs_fingerprint() {
  local shots rel
  shots="$(cd "$SCREENSHOT_DIR" && pwd)"
  rel="${shots#"$PWD"/}"
  local -a spec=(docs/)
  if [ "$rel" != "$shots" ]; then spec+=(":(exclude)$rel"); fi
  {
    git status --porcelain --untracked-files=all -- "${spec[@]}"
    git diff --binary -- "${spec[@]}"
    git ls-files -z --others --exclude-standard -- "${spec[@]}" | xargs -0 -r sha1sum
  } | sha1sum
}
DOCS_BEFORE="$(docs_fingerprint)"

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
# The global limit stays at its default of 300 per minute (checkpoint C2, ruling 3.5): it keys on the
# session id when signed in (F3). Measured on the full suite, 2026-11-20: 867 API requests, at most 265
# in any 60 seconds for one user and 82 for requests without a session.
# Each server starts in its own session (setsid), so one kill of the group stops tsx or next and its children.
setsid env API_HOST=127.0.0.1 TRUST_PROXY=loopback RATE_LIMIT_LOGIN_PER_MINUTE=500 \
  bash -c 'cd apps/api && exec ./node_modules/.bin/tsx src/server.ts' >"$LOGS/api.log" 2>&1 &
PIDS+=("$!")
wait_for "http://127.0.0.1:${API_PORT}/health" "API" "$LOGS/api.log" || exit 1

setsid bash -c 'cd apps/web && exec node node_modules/next/dist/bin/next start -p "$WEB_PORT" -H 127.0.0.1' \
  >"$LOGS/web.log" 2>&1 &
PIDS+=("$!")
wait_for "http://127.0.0.1:${WEB_PORT}/login" "web" "$LOGS/web.log" || exit 1

# E2E_ARGS narrows the run (for example a work package gate): `E2E_ARGS="clinician- --project=desktop-1440"`.
if [ -n "${E2E_ARGS:-}" ]; then
  # shellcheck disable=SC2086
  pnpm --filter @carepath/web exec playwright test --config e2e/playwright.config.ts $E2E_ARGS
else
  pnpm --filter @carepath/web e2e
fi
status=$?
if [ "$(docs_fingerprint)" != "$DOCS_BEFORE" ]; then
  echo "e2e: the end-to-end stage changed files under docs/ (checkpoint C2, F5):" >&2
  git status --porcelain --untracked-files=all -- docs/ >&2
  [ "$status" -ne 0 ] || status=1
fi
if [ "$status" -ne 0 ]; then
  echo "e2e: Playwright failed; API log tail:" >&2; tail -n 15 "$LOGS/api.log" >&2
  echo "e2e: web log tail:" >&2; tail -n 15 "$LOGS/web.log" >&2
fi
exit "$status"
