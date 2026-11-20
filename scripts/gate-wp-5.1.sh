#!/usr/bin/env bash
# WP 5.1 gate: AI pipeline in packages/ai (ADR-5, ADR-6). No database or network is needed for the
# package stages; `pnpm verify` at the end takes its own lease and database (scripts/gate-env.sh).
# Stages: typecheck, lint and format of packages/ai, the named test groups (schema validity,
# timeout and retry, injection set, redaction canary, evidence verifier), the whole package suite,
# eval case validation, an eval smoke run written to scratch (docs/ is never touched by the gate),
# then `pnpm verify` and a clean `git status`.
#
#   GATE_SKIP_VERIFY=1 scripts/gate-wp-5.1.sh   skip the final `pnpm verify` (development loops only)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
stage() { local name="$1"; shift; echo; echo "==> $name"; "$@" || { echo "FAILED: $name" >&2; exit 1; }; }
vt() { pnpm --filter @carepath/ai exec vitest run "$@"; }

stage "typecheck (packages/ai)" pnpm --filter @carepath/ai typecheck
stage "lint (packages/ai)" pnpm exec eslint packages/ai
stage "format (packages/ai)" pnpm exec prettier --check packages/ai
stage "schema validity (output schemas, eval case schema)" vt test/schemas.test.ts
stage "timeout, bounded retry, backoff, consent, rate limit, cost record" vt test/pipeline.test.ts
stage "prompt-injection set" vt test/injection.test.ts
stage "redaction and outbound canary" vt test/redaction.test.ts
stage "evidence verifier" vt test/verifier.test.ts
stage "all packages/ai tests" pnpm --filter @carepath/ai test
stage "eval cases match EvalCase v1" pnpm --filter @carepath/ai exec tsx evals/check.ts
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
stage "eval smoke run (scratch output)" pnpm --filter @carepath/ai exec tsx evals/run.ts --out "$SCRATCH/ai-eval.md"
if [ -z "${GATE_SKIP_VERIFY:-}" ]; then
  stage "pnpm verify" pnpm verify
fi
stage "git status clean" bash -c 'test -z "$(git status --porcelain)" || { git status --porcelain; exit 1; }'
echo; echo "WP 5.1 gate: PASSED"
