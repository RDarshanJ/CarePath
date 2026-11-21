#!/usr/bin/env bash
# D-WP-5 gate (rebuild plan section 3): healthcare components kit in packages/ui/src/components/healthcare.
#   G1   typecheck of packages/ui and apps/web; lint and format of the paths this package owns; the
#        packages/ui unit tests (states, wording and chart-table equality per component)
#   G2   the token tests (packages/ui contrast.test.ts, part of the same run)
#   row  presentation only: no fetch, query client, API path or browser storage in the healthcare layer
#   G3, G4, G6  the gallery specs (design-system and design-system-healthcare): axe on every specimen at
#        390 and 1440, keyboard and state behaviour in a real browser (API 4105, web 3105, web lock)
#   G5, G8  design capture of the five healthcare family pages at six widths with the probe (axe at 375,
#        768 and 1440); fails on a warm background, horizontal overflow or an axe serious or critical
#        finding. CAPTURE_DIR defaults to scratch in .data/; docs/design/after/d-wp-5/ was made by the
#        same command.
#   G9   pnpm verify, then a clean git status.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-d5.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

OWNED=(
  packages/ui/src/components/healthcare
  packages/ui/src/index.ts
  "apps/web/app/(public)/design-system"
  apps/web/e2e/design-system-healthcare.spec.ts
  apps/web/scripts/design-capture.mjs
)

run pnpm --filter @carepath/ui typecheck
run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"
run pnpm --filter @carepath/ui exec vitest run --reporter=dot

echo; echo "==> presentation only: no data fetching or browser storage in the healthcare layer"
hits="$(grep -rnE "fetch\(|useQuery|useMutation|@tanstack|['\"\`]/api/|localStorage|sessionStorage|XMLHttpRequest" \
  packages/ui/src/components/healthcare --include=*.ts --include=*.tsx | grep -v "\.test\.tsx:" || true)"
if [ -n "$hits" ]; then echo "$hits"; echo "FAILED: the healthcare layer must not fetch or store" >&2; exit 1; fi
echo "ok: no fetch, query, API path or storage"

echo; echo "==> gallery specs (design-system and design-system-healthcare), API 4105, web 3105"
gallery() {
  # shellcheck source=scripts/gate-env.sh
  source scripts/gate-env.sh wpd5 4105 3105 || return 1
  pnpm db:migrate >.data/d5-migrate.log 2>&1 || { tail -20 .data/d5-migrate.log; return 1; }
  pnpm db:seed --profile small >.data/d5-seed.log 2>&1 || { tail -20 .data/d5-seed.log; return 1; }
  pnpm --filter @carepath/web build >.data/d5-build.log 2>&1 || { tail -30 .data/d5-build.log; return 1; }
  E2E_ARGS="design-system" scripts/e2e.sh
}
export -f gallery
run scripts/with-web-lock.sh bash -c gallery

export CAPTURE_DIR="${CAPTURE_DIR:-$PWD/.data/capture-d-wp-5}"
export SCREENS="${SCREENS:-design-system-healthcare}"
export PROBE_FAIL_ON="${PROBE_FAIL_ON:-warm,overflow,axe}"
run scripts/with-web-lock.sh scripts/design-capture.sh wpd5 4105 3105

if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "D-WP-5 gate: PASSED"
