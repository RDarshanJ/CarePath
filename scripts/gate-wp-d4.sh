#!/usr/bin/env bash
# D-WP-4 gate (rebuild plan section 3 and section 6): Storybook for packages/ui.
#   G1   typecheck of packages/ui (stories and .storybook included) and apps/web (the Storybook spec);
#        lint and format of the paths this package owns; the packages/ui unit tests, which include the
#        story-coverage test (one story per exported component, reasoned exclusion list)
#   G2   `storybook build` (static, into packages/ui/.storybook-static, gitignored)
#   G3   the Storybook spec: axe on every story, in both themes, at 375 and 1440, against the static
#        build served by apps/web/storybook-e2e/serve-static.mjs (port 6104, web lock; no API or database)
#   G4   pnpm verify, then a clean git status.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-d4.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

OWNED=(
  packages/ui/.storybook
  packages/ui/src/stories
  packages/ui/src/components
  packages/ui/package.json
  apps/web/storybook-e2e
  apps/web/e2e/design-system.spec.ts
  packages/config/eslint
)

run pnpm --filter @carepath/ui typecheck
run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${OWNED[@]}"
run pnpm exec prettier --check "${OWNED[@]}" scripts/gate-wp-d4.sh
run pnpm --filter @carepath/ui exec vitest run --reporter=dot

echo; echo "==> static Storybook build"
rm -rf packages/ui/.storybook-static
run pnpm --filter @carepath/ui storybook:build
stories="$(node -e 'const i=require("./packages/ui/.storybook-static/index.json");console.log(Object.values(i.entries).filter((e)=>e.type==="story").length)')"
echo "stories in the build: $stories"

echo; echo "==> Storybook spec: axe on every story, both themes, 375 and 1440"
export PLAYWRIGHT_CHROME_PATH="${PLAYWRIGHT_CHROME_PATH:-/usr/bin/google-chrome}"
export STORYBOOK_PORT="${STORYBOOK_PORT:-6104}"
run scripts/with-web-lock.sh pnpm --filter @carepath/web e2e:storybook

if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "D-WP-4 gate: PASSED"
