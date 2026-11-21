#!/usr/bin/env bash
# D-WP-U gate (DR-004 section 4): the foundation fixes made once before the screen slices.
#   G1   typecheck of packages/ui, packages/shared and apps/web; lint and format of the paths this batch
#        owns or migrated; the packages/ui and packages/shared unit tests (token test with nav-label, the
#        neutral SlotButton, the bottom bar label and badge, the one unsupported-statement wording, the
#        draft block header weights)
#   -    structure: no `<wbr>` in a nav label, no second unsupported-statement string, the kit keeps the
#        cobalt outline only where a gallery specimen shows the `secondary` variant itself, the staff
#        shell has no `md:` sidebar left, no area picture at hero or overview size
#   G3, G4, G6  end-to-end at 390 and 1440 (API 4120, web 3120, web lock): shells (with the U1 sidebar
#        test), auth (waits for the h1 before axe, ruling 6.7), patient-scheduling, clinician-scenario-d,
#        and the two gallery specs
#   G5, G8  design capture of every baseline screen at six widths with
#        PROBE_FAIL_ON=warm,overflow,axe,targets,pictures (targets count real targets only, U6). The
#        recorded set in docs/design/after/d-wp-u/ was made by the same command with CAPTURE_DIR set.
#   G9   pnpm verify, then a clean git status.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-du.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

OWNED=(
  packages/ui/src/components
  packages/ui/src/tokens
  packages/ui/src/lib
  packages/ui/src/index.ts
  packages/shared/src/labels
  "apps/web/app/(clinician)/_components/staff-shell.tsx"
  "apps/web/app/(patient)/_components/patient-frame.tsx"
  "apps/web/app/(admin)/layout.tsx"
  "apps/web/app/(public)/login"
  apps/web/components/illustration.tsx
  apps/web/lib/illustrations.ts
  apps/web/scripts/design-capture.mjs
  apps/web/e2e/fixtures.ts
  apps/web/e2e/shells.spec.ts
  apps/web/e2e/auth.spec.ts
)
# Call sites migrated mechanically (U3 secondary to neutral or quiet, U9 picture size).
MIGRATED=(
  "apps/web/app/(admin)/admin/patients"
  "apps/web/app/(clinician)/_components/common.tsx"
  "apps/web/app/(clinician)/_components/plan-view.tsx"
  "apps/web/app/(clinician)/_lib/context.tsx"
  "apps/web/app/(clinician)/inbox/messages.tsx"
  "apps/web/app/(clinician)/overview/overview.tsx"
  "apps/web/app/(clinician)/patients/directory.tsx"
  "apps/web/app/(clinician)/patients/[patientId]"
  "apps/web/app/(clinician)/review-queue/queue.tsx"
  "apps/web/app/(clinician)/schedule/schedule.tsx"
  "apps/web/app/(patient)/(app)/appointments/page.tsx"
  "apps/web/app/(patient)/(app)/plan/page.tsx"
  "apps/web/app/(patient)/(session)/session/page.tsx"
  "apps/web/app/(patient)/_components/booking-flow.tsx"
  "apps/web/app/(patient)/_components/cancel-visit.tsx"
  "apps/web/app/(patient)/_components/plan-change-note.tsx"
  "apps/web/app/(patient)/_components/session-player.tsx"
  "apps/web/app/(patient)/_components/table-toggle.tsx"
  "apps/web/app/(patient)/_components/thread-view.tsx"
  "apps/web/app/(public)/design-system"
)

run pnpm --filter @carepath/ui typecheck
run pnpm --filter @carepath/shared typecheck
run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]}" "${MIGRATED[@]}"
run pnpm exec prettier --check "${OWNED[@]}" "${MIGRATED[@]}" packages/ui/src/styles docs/design/tokens-final.json
run pnpm --filter @carepath/ui exec vitest run --reporter=dot
run pnpm --filter @carepath/shared exec vitest run --reporter=dot

echo; echo "==> structure"
bad=0
fail() { echo "not ok: $1"; bad=1; }
grep -rn "<wbr" packages/ui/src/components "apps/web/app/(patient)/_components/patient-frame.tsx" \
  "apps/web/app/(clinician)/_components/staff-shell.tsx" && fail "a <wbr> is left in a navigation label (U4)"
grep -rnE "no supporting record found|have no source|has no source" -i packages/ui/src packages/shared/src \
  apps/web/app apps/web/components --include=*.ts --include=*.tsx && fail "a second unsupported-statement wording (U7)"
hits="$(grep -rn 'variant="secondary"' packages/ui/src/components --include=*.tsx | grep -v "\.test\.tsx:" | grep -v "\.stories\.tsx:" || true)"
# Left by design: the dialog safe choice beside a destructive confirm (CD-421) and the leave guard's
# "Keep editing", each the single supporting action beside a primary inside an overlay.
extra="$(echo "$hits" | grep -v "composed/overlays.tsx" | grep -v '^$' || true)"
[ -z "$extra" ] || { echo "$extra"; fail "a cobalt outline left in the kit outside the overlays (U3)"; }
grep -nE "\bmd:" "apps/web/app/(clinician)/_components/staff-shell.tsx" && fail "the staff shell still switches at md (U2)"
grep -rnE "exerciseIllustration\([^)]*\)" apps/web/app --include=*.tsx | grep -vE '"(hero|overview|tile)"\)' \
  && fail "exerciseIllustration called without a size (U9)"
[ "$bad" -eq 0 ] || { echo "FAILED: structure" >&2; exit 1; }
echo "ok: no <wbr>, one unsupported wording, no kit cobalt outline outside overlays, staff shell at lg, picture sizes named"

echo; echo "==> end-to-end (shells, auth, patient-scheduling, clinician-scenario-d, galleries), API 4120, web 3120"
e2e() {
  # shellcheck source=scripts/gate-env.sh
  source scripts/gate-env.sh wpdu 4120 3120 || return 1
  pnpm db:migrate >.data/du-migrate.log 2>&1 || { tail -20 .data/du-migrate.log; return 1; }
  pnpm db:seed --profile small >.data/du-seed.log 2>&1 || { tail -20 .data/du-seed.log; return 1; }
  pnpm --filter @carepath/web build >.data/du-build.log 2>&1 || { tail -30 .data/du-build.log; return 1; }
  E2E_ARGS="shells auth patient-scheduling clinician-scenario-d design-system" scripts/e2e.sh
}
export -f e2e
run scripts/with-web-lock.sh bash -c e2e

export CAPTURE_DIR="${CAPTURE_DIR:-$PWD/.data/capture-d-wp-u}"
export PROBE_FAIL_ON="${PROBE_FAIL_ON:-warm,overflow,axe,targets,pictures}"
export CAPTURE_SKIP_BUILD=1
run scripts/with-web-lock.sh scripts/design-capture.sh wpdu 4120 3120

if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "D-WP-U gate: PASSED"
