#!/usr/bin/env bash
# D-WP-6 gate (rebuild plan section 3): shells, navigation and sign-in.
#   G1   typecheck of packages/ui and apps/web; lint and format of the paths this package owns or touched;
#        the packages/ui unit tests (nav, table)
#   G2   the token tests (packages/ui contrast.test.ts, part of the same run)
#   -    structure: the hand-built patient BottomNav, HeaderNav and UnreadCount are gone, the old shared
#        shells file is gone, the staff order is DR-002 H, one SkipLink per shell
#   G3, G4, G6  end-to-end: shells.spec (skip link first, landmarks, signed in as, badges equal the API
#        totals, back link, admin without navigation, keyboard passes with focus never under a sticky bar),
#        plus the existing specs that assert navigation (auth, patient-scheduling, clinician-scenario-d),
#        at 390 and 1440 (API 4106, web 3106, web lock)
#   G5, G8  design capture of every baseline screen at six widths with the probe (axe at 375, 768, 1440);
#        fails on a warm background or an axe serious or critical finding anywhere, and on horizontal
#        overflow or a shell target under the theme floor on any screen whose layout this package owns
#        (see scripts/gate-wp-d6-probe.mjs). CAPTURE_DIR defaults to scratch in .data/; the recorded set in
#        docs/design/after/d-wp-6/ was made by the same command.
#   G9   pnpm verify, then a clean git status.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-d6.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

OWNED=(
  "apps/web/app/(patient)/layout.tsx"
  "apps/web/app/(patient)/(app)/layout.tsx"
  "apps/web/app/(patient)/(session)/layout.tsx"
  "apps/web/app/(patient)/_components/patient-frame.tsx"
  "apps/web/app/(clinician)/layout.tsx"
  "apps/web/app/(clinician)/_components/staff-shell.tsx"
  "apps/web/app/(clinician)/_components/staff-search.tsx"
  "apps/web/app/(admin)/layout.tsx"
  "apps/web/app/(public)/login"
  "apps/web/app/(public)/page.tsx"
  "apps/web/app/(public)/layout.tsx"
  apps/web/app/layout.tsx
  apps/web/components/back-link.tsx
  apps/web/components/sign-out-button.tsx
  apps/web/lib/api/client.ts
  apps/web/e2e/shells.spec.ts
  apps/web/e2e/auth.spec.ts
  apps/web/e2e/fixtures.ts
  apps/web/e2e/patient-helpers.ts
  packages/ui/src/components/composed/nav.tsx
  packages/ui/src/components/composed/table.tsx
  scripts/gate-wp-d6-probe.mjs
)

run pnpm --filter @carepath/ui typecheck
run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}" packages/ui/src/styles/components.css
run pnpm --filter @carepath/ui exec vitest run --reporter=dot

echo; echo "==> structure"
bad=0
fail() { echo "not ok: $1"; bad=1; }
grep -rnE "function (BottomNav|HeaderNav|UnreadCount)\b" apps/web/app apps/web/components && fail "hand-built patient nav or badge still present"
[ -e apps/web/components/shells.tsx ] && fail "apps/web/components/shells.tsx still present"
order="$(grep -oE 'label: "(Overview|Schedule|Patients|Review queue|Messages)"' "apps/web/app/(clinician)/_components/staff-shell.tsx" | sed -E 's/label: "(.*)"/\1/' | paste -sd, -)"
[ "$order" = "Overview,Schedule,Patients,Review queue,Messages" ] || fail "staff order is '$order', DR-002 H wants Overview,Schedule,Patients,Review queue,Messages"
skips="$(grep -rlE "<SkipLink" apps/web/app apps/web/components | grep -v "design-system" | sort | paste -sd' ' -)"
expected="apps/web/app/(admin)/layout.tsx apps/web/app/(clinician)/_components/staff-shell.tsx apps/web/app/(patient)/layout.tsx apps/web/app/(public)/login/page.tsx"
[ "$skips" = "$expected" ] || fail "SkipLink rendered in: $skips"
grep -rn "DemoNotice" apps/web/app/layout.tsx >/dev/null && fail "the demo notice is still rendered outside the route groups"
grep -rnE "localStorage|sessionStorage" "apps/web/app/(clinician)/_components/staff-search.tsx" apps/web/components/back-link.tsx && fail "browser storage in the search store or back link (R1)"
[ "$bad" -eq 0 ] || { echo "FAILED: structure" >&2; exit 1; }
echo "ok: no hand-built patient nav, no old shells file, DR-002 H order, one SkipLink per shell, demo notice in the groups, no browser storage"

echo; echo "==> end-to-end (shells, auth, patient-scheduling, clinician-scenario-d), API 4106, web 3106"
e2e() {
  # shellcheck source=scripts/gate-env.sh
  source scripts/gate-env.sh wpd6 4106 3106 || return 1
  pnpm db:migrate >.data/d6-migrate.log 2>&1 || { tail -20 .data/d6-migrate.log; return 1; }
  pnpm db:seed --profile small >.data/d6-seed.log 2>&1 || { tail -20 .data/d6-seed.log; return 1; }
  pnpm --filter @carepath/web build >.data/d6-build.log 2>&1 || { tail -30 .data/d6-build.log; return 1; }
  E2E_ARGS="shells auth patient-scheduling clinician-scenario-d" scripts/e2e.sh
}
export -f e2e
run scripts/with-web-lock.sh bash -c e2e

export CAPTURE_DIR="${CAPTURE_DIR:-$PWD/.data/capture-d-wp-6}"
export PROBE_FAIL_ON="${PROBE_FAIL_ON:-warm,axe}"
export CAPTURE_SKIP_BUILD=1
run scripts/with-web-lock.sh scripts/design-capture.sh wpd6 4106 3106
run node scripts/gate-wp-d6-probe.mjs "$CAPTURE_DIR/_probe.json"

if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "D-WP-6 gate: PASSED"
