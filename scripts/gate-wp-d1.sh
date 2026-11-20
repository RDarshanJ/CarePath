#!/usr/bin/env bash
# D-WP-1 gate (rebuild plan section 3): tokens, type and capture tooling.
#   G2   the rewritten token tests (packages/ui contrast.test.ts, DR-001 section 8)
#   -    docs/design/tools/contrast.mjs --strict on docs/design/tokens-final.json
#   G1   typecheck, lint and format of the paths this package owns
#   G5   the full design capture of every baseline screen at six widths, probe must find no warm background
#        (API 4101, web 3101, under the web lock). CAPTURE_DIR defaults to scratch in .data/; the recorded set
#        in docs/design/after/d-wp-1/ was made by the same command with CAPTURE_DIR set to it.
#   G9   pnpm verify, then a clean git status.
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-d1.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .data
run() { echo; echo "==> $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }
# ESLint covers the code paths; Prettier also covers the stylesheets and the README.
LINTED=(
  packages/ui/src/tokens
  packages/ui/src/fonts.ts
  packages/ui/src/components/ai-draft.tsx
  apps/web/app/layout.tsx
  "apps/web/app/(public)/design-system"
  apps/web/scripts
)
FORMATTED=(
  "${LINTED[@]}"
  packages/ui/src/styles
  apps/web/app/globals.css
  docs/design-system/README.md
)

run pnpm --filter @carepath/ui exec vitest run src/tokens --reporter=verbose

echo; echo "==> contrast.mjs --strict on tokens-final.json"
FINAL=docs/design/tokens-candidates/FINAL.json
cp docs/design/tokens-final.json "$FINAL"
node docs/design/tools/contrast.mjs FINAL --strict >.data/d1-contrast.md 2>&1
status=$?
rm -f "$FINAL"
grep -E "^### theme" .data/d1-contrast.md
[ "$status" -eq 0 ] || { tail -n 20 .data/d1-contrast.md; echo "FAILED: contrast.mjs --strict" >&2; exit 1; }
echo "contrast.mjs --strict: exit 0"

run pnpm --filter @carepath/ui typecheck
run pnpm --filter @carepath/web typecheck
run pnpm exec eslint "${LINTED[@]}"
run pnpm exec prettier --check "${FORMATTED[@]}"

export CAPTURE_DIR="${CAPTURE_DIR:-$PWD/.data/capture-d-wp-1}"
export PROBE_FAIL_ON="${PROBE_FAIL_ON:-warm}"
run scripts/with-web-lock.sh scripts/design-capture.sh wpd1 4101 3101

if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  run pnpm verify
fi
echo; echo "==> git status --porcelain"
dirty="$(git status --porcelain)"
if [ -n "$dirty" ]; then echo "$dirty"; echo "FAILED: working tree not clean" >&2; exit 1; fi
echo "(clean)"
echo; echo "D-WP-1 gate: PASSED"
