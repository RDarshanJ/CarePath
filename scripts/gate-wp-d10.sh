#!/usr/bin/env bash
# D-WP-10 gate (rebuild plan section 3; DR-004 section 5): the guided session player and pain reporting.
#   G1   typecheck of apps/web; lint and format of the paths this package owns or touched
#   -    structure: the player and check-in form live in the owned route folders (the old shared
#        _components files are gone); no localStorage, and sessionStorage only for the set count (R1);
#        no band word next to a pain number (R4); no cobalt outline in the owned routes except the
#        critical-tone Stop controls (DR-004 5.1.1); every picture names its size (U9)
#   G3, G4, G6  end-to-end at 390 and 1440 (API 4110, web 3110, web lock): session-player.spec (primary
#        and Stop on screen at 375 by 667 and 390 by 844 in every phase; pause, resume, reload and stop;
#        stop without a number; preselected number after a stop; one contact notice; timer role and
#        milestones; R1 storage; pain scale wrap; reduced motion; keyboard pass with focus clear of the
#        bar), patient.spec Scenario C, slice.spec, shells.spec
#   G5, G8  design capture of the session, discomfort and check-in screens at six widths with
#        PROBE_FAIL_ON=warm,overflow,axe,targets,pictures. CAPTURE_DIR defaults to scratch in .data/; the
#        recorded set in docs/design/after/d-wp-10/ was made by the same command with CAPTURE_DIR set.
#   G9   pnpm verify, then a clean git status.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-d10.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

SESSION="apps/web/app/(patient)/(session)"
CHECKIN="apps/web/app/(patient)/(app)/check-in"
OWNED=(
  "$SESSION"
  "$CHECKIN"
  apps/web/e2e/session-player.spec.ts
  apps/web/e2e/patient.spec.ts
  apps/web/e2e/patient-helpers.ts
  apps/web/scripts/design-capture.mjs
)

run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"

echo; echo "==> structure"
bad=0
fail() { echo "not ok: $1"; bad=1; }
for f in session-player.tsx start-session.tsx use-timers.ts check-in-form.tsx; do
  [ -e "apps/web/app/(patient)/_components/$f" ] && fail "apps/web/app/(patient)/_components/$f still present"
done
grep -rn "localStorage" "$SESSION" "$CHECKIN" && fail "localStorage in the session or check-in (R1)"
grep -rnE "sessionStorage\.setItem\(" "$SESSION" "$CHECKIN" | grep -v 'setItem(storageKey, String(' \
  && fail "sessionStorage holds something other than the set count (R1)"
grep -rniE "\b(mild|moderate|severe)\b" "$SESSION" "$CHECKIN" && fail "a band word in the session or check-in (R4)"
grep -rnE 'variant="secondary"' "$SESSION" "$CHECKIN" | grep -v 'tone="critical"' \
  && fail "a cobalt outline that is not a critical-tone Stop control (DR-004 5.1.1)"
grep -rnE "exerciseIllustration\([^)]*\)" "$SESSION" "$CHECKIN" | grep -vE '"(hero|overview|tile)"\)' \
  && fail "exerciseIllustration called without a size (U9)"
[ "$bad" -eq 0 ] || { echo "FAILED: structure" >&2; exit 1; }
echo "ok: owned folders only, set count only in sessionStorage, no band words, Stop is the only outline, sizes named"

echo; echo "==> end-to-end (session-player, patient, slice, shells), API 4110, web 3110"
e2e() {
  # shellcheck source=scripts/gate-env.sh
  source scripts/gate-env.sh wpd10 4110 3110 || return 1
  pnpm db:migrate >.data/d10-migrate.log 2>&1 || { tail -20 .data/d10-migrate.log; return 1; }
  pnpm db:seed --profile small >.data/d10-seed.log 2>&1 || { tail -20 .data/d10-seed.log; return 1; }
  pnpm --filter @carepath/web build >.data/d10-build.log 2>&1 || { tail -30 .data/d10-build.log; return 1; }
  E2E_ARGS="${D10_E2E:-patient.spec session-player slice shells}" scripts/e2e.sh
}
export -f e2e
run scripts/with-web-lock.sh bash -c e2e

export CAPTURE_DIR="${CAPTURE_DIR:-$PWD/.data/capture-d-wp-10}"
export PROBE_FAIL_ON="${PROBE_FAIL_ON:-warm,overflow,axe,targets,pictures}"
export SCREENS="${SCREENS:-patient-today-session-persona,patient-session-,patient-discomfort-,patient-check-in}"
export CAPTURE_SKIP_BUILD=1
run scripts/with-web-lock.sh scripts/design-capture.sh wpd10 4110 3110

if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "D-WP-10 gate: PASSED"
