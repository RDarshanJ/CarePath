#!/usr/bin/env bash
# D-WP-2 gate (rebuild plan section 3): primitives, feedback, overlays, accessibility infrastructure.
#   G1   typecheck of packages/ui and apps/web; lint and format of the paths this package owns and the
#        call sites it migrated; the packages/ui unit tests (states and keyboard rules per component)
#   G2   the token tests (packages/ui contrast.test.ts, part of the same run)
#   -    no component left in two versions: the duplicates named in component-usage-matrix.md are gone
#        (the only exceptions are the two files WP B-CR owned during D-WP-2, listed below)
#   G3, G4, G6  the gallery spec: axe on every /design-system specimen at 390 and 1440, and the keyboard
#        and state behaviour of the components in a real browser (API 4102, web 3102, web lock)
#   G5, G8  design capture of the gallery (six widths, reduced motion, 200 percent zoom) and every
#        baseline screen; the probe must find no warm background. CAPTURE_DIR defaults to scratch in
#        .data/; the recorded set in docs/design/after/d-wp-2/ was made by the same command.
#   G9   pnpm verify, then a clean git status.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-d2.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

OWNED=(
  packages/ui/src/components
  packages/ui/src/lib
  packages/ui/src/index.ts
  "apps/web/app/(public)/design-system"
  apps/web/e2e/design-system.spec.ts
  apps/web/scripts/design-capture.mjs
  apps/web/components
)
MIGRATED=(
  "apps/web/app/(clinician)/_components/common.tsx"
  "apps/web/app/(clinician)/_components/intake.tsx"
  "apps/web/app/(clinician)/_lib/context.tsx"
  "apps/web/app/(clinician)/inbox/messages.tsx"
  "apps/web/app/(clinician)/layout.tsx"
  "apps/web/app/(clinician)/overview/overview.tsx"
  "apps/web/app/(clinician)/patients/[patientId]"
  "apps/web/app/(clinician)/review-queue/queue.tsx"
  "apps/web/app/(clinician)/schedule/schedule.tsx"
  "apps/web/app/(patient)/(app)/appointments/page.tsx"
  "apps/web/app/(patient)/(app)/layout.tsx"
  "apps/web/app/(patient)/(app)/today/page.tsx"
  "apps/web/app/(patient)/(session)/session/page.tsx"
  "apps/web/app/(patient)/_components"
  "apps/web/app/(public)/login/page.tsx"
  apps/web/app/layout.tsx
)

run pnpm --filter @carepath/ui typecheck
run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]}" "${MIGRATED[@]}"
run pnpm exec prettier --check "${OWNED[@]}" "${MIGRATED[@]}" packages/ui/src/styles
run pnpm --filter @carepath/ui exec vitest run --reporter=dot

echo; echo "==> one version of each component (component-usage-matrix.md A2, A3, B, E, H)"
# Files WP B-CR edits during D-WP-2; their remaining duplicates are listed in docs/PROGRESS.md.
EXEMPT='patients/directory\.tsx|\(admin\)/admin/patients/'
dupes=0
check() { # description, pattern
  local hits
  hits="$(grep -rnE "$2" apps/web/app apps/web/components --include=*.tsx | grep -vE "$EXEMPT" | grep -v "(public)/design-system" || true)"
  if [ -n "$hits" ]; then echo "duplicate: $1"; echo "$hits"; dupes=1; else echo "ok: $1"; fi
}
check "text link (AppLink, TextLink, ButtonLink components)" "function (AppLink|TextLink|ButtonLink)\b"
check "hand-styled next/link with link classes" "<NextLink[^>]*underline-offset-2"
check "clinician Empty wrapper" "<Empty\b|function Empty\("
check "local SkipLink" "function SkipLink"
check "patient UnreadCount badge" "function UnreadCount"
check "hand-built inline error" 'sr-only">Error: '
check "hand-built error summary" "things to fix\"\)?\s*:\s*\("
check "local LoadMore or raw load-more buttons" "function LoadMore|Load more "
check "raw table header row" "<THead>\s*<tr>"
check "error toasts (CD-442)" "tone: \"error\""
check "TooltipProvider with no tooltip" "<TooltipProvider"
check "hand-built booking chips" "chipOn|chipOff"
check "class-override danger on a secondary button" "border-error-ink text-error-ink\""
check "inline scroll-padding style tags (CD-125)" "scroll-padding"
[ "$dupes" -eq 0 ] || { echo "FAILED: a duplicate is still in the tree" >&2; exit 1; }

echo; echo "==> gallery spec (axe per specimen, keyboard and states), API 4102, web 3102"
gallery() {
  # shellcheck source=scripts/gate-env.sh
  source scripts/gate-env.sh wpd2 4102 3102 || return 1
  pnpm db:migrate >.data/d2-migrate.log 2>&1 || { tail -20 .data/d2-migrate.log; return 1; }
  pnpm db:seed --profile small >.data/d2-seed.log 2>&1 || { tail -20 .data/d2-seed.log; return 1; }
  pnpm --filter @carepath/web build >.data/d2-build.log 2>&1 || { tail -30 .data/d2-build.log; return 1; }
  E2E_ARGS="design-system" scripts/e2e.sh
}
export -f gallery
run scripts/with-web-lock.sh bash -c gallery

export CAPTURE_DIR="${CAPTURE_DIR:-$PWD/.data/capture-d-wp-2}"
export PROBE_FAIL_ON="${PROBE_FAIL_ON:-warm}"
run scripts/with-web-lock.sh scripts/design-capture.sh wpd2 4102 3102

if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "D-WP-2 gate: PASSED"
