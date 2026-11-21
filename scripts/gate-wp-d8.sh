#!/usr/bin/env bash
# D-WP-8 gate (rebuild plan section 3): onboarding and consent.
#   G1   typecheck of apps/web; lint and format of the paths this package owns
#   -    structure: no browser storage in onboarding (R1), no ToggleChip or Switch, the camera movement
#        consent is not offered (C3 item 5), at most one variant="secondary" per route file (DR-004 5.1)
#   G3, G4, G6  end-to-end: onboarding.spec (all 11 steps, errors, resume, consent, reload warning with
#        storage read, keyboard), the slice spec that onboards through the UI, shells and patient specs
#        that touch these routes, at 390 and 1440 (API 4108, web 3108, web lock)
#   G5, G8  design capture of the onboarding and consent screens at six widths with
#        PROBE_FAIL_ON=warm,overflow,axe,targets (DR-004 5.1 rule 8); the recorded set lives in
#        docs/design/after/d-wp-8/ and was made by the same command
#   G9   pnpm verify, then a clean git status.
#   GATE_SKIP_VERIFY=1   skip the final `pnpm verify`; GATE_SKIP_CAPTURE=1 skip the capture (dev loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

OWNED=(
  "apps/web/app/(patient)/onboarding"
  "apps/web/app/(patient)/(app)/consent"
  "apps/web/app/(patient)/_lib/consent-copy.ts"
  "apps/web/app/(patient)/_components/consent-wording.tsx"
  apps/web/e2e/onboarding.spec.ts
  apps/web/e2e/onboarding-helpers.ts
  apps/web/e2e/slice.spec.ts
  apps/web/e2e/patient.spec.ts
  apps/web/e2e/shells.spec.ts
  scripts/gate-wp-d8-probe.mjs
)

run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}"

echo; echo "==> structure"
bad=0
fail() { echo "not ok: $1"; bad=1; }
grep -rnE "localStorage|sessionStorage" "apps/web/app/(patient)/onboarding" "apps/web/app/(patient)/(app)/consent" "apps/web/app/(patient)/_components/consent-wording.tsx" && fail "browser storage in onboarding or consent (R1)"
grep -rnE "ToggleChip|<Switch" "apps/web/app/(patient)/onboarding" "apps/web/app/(patient)/(app)/consent" && fail "ToggleChip or Switch in onboarding or consent (DR-004 6.1, CD-140)"
grep -rniE "title: \"camera|motion_tracking: \{|\"Camera movement" "apps/web/app/(patient)/_lib/consent-copy.ts" "apps/web/app/(patient)/onboarding" "apps/web/app/(patient)/(app)/consent" && fail "camera movement tracking offered (C3 item 5)"
for f in $(grep -rlE 'variant="secondary"' "apps/web/app/(patient)/onboarding" "apps/web/app/(patient)/(app)/consent"); do
  [ "$(grep -c 'variant="secondary"' "$f")" -le 1 ] || fail "more than one secondary button in $f"
done
[ "$bad" -eq 0 ] || { echo "FAILED: structure" >&2; exit 1; }
echo "ok: no browser storage, no chips or switch, no camera consent, secondary buttons within the rule"

echo; echo "==> end-to-end (onboarding, slice, shells, patient), API 4108, web 3108"
e2e() {
  # shellcheck source=scripts/gate-env.sh
  source scripts/gate-env.sh wpd8 4108 3108 || return 1
  pnpm db:migrate >.data/d8-migrate.log 2>&1 || { tail -20 .data/d8-migrate.log; return 1; }
  pnpm db:seed --profile small >.data/d8-seed.log 2>&1 || { tail -20 .data/d8-seed.log; return 1; }
  pnpm --filter @carepath/web build >.data/d8-build.log 2>&1 || { tail -30 .data/d8-build.log; return 1; }
  E2E_ARGS="${E2E_ARGS_OVERRIDE:-onboarding slice shells patient}" scripts/e2e.sh
}
export -f e2e
run scripts/with-web-lock.sh bash -c e2e

if [ -z "${GATE_SKIP_CAPTURE:-}" ]; then
  export CAPTURE_DIR="${CAPTURE_DIR:-$PWD/.data/capture-d-wp-8}"
  export PROBE_FAIL_ON="${PROBE_FAIL_ON:-warm,overflow,axe,targets}"
  export SCREENS="${SCREENS:-patient-onboarding,patient-consent}"
  run scripts/with-web-lock.sh scripts/design-capture.sh wpd8 4108 3108
  run node scripts/gate-wp-d8-probe.mjs "$CAPTURE_DIR/_probe.json"
fi

if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "D-WP-8 gate: PASSED"
