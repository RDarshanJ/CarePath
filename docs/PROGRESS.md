# CarePath progress

Date: 2026-11-19. Synthetic data only; not for clinical use.

## Completed

- WP 2.1 Monorepo, tooling, CLAUDE.md, scripts/db.sh, `pnpm verify` skeleton, compose file, CI workflow (gate output below).

## Outstanding

- WP 2.2 tooling probe; 2.3 schema and constraints; 2.4 API core; 2.5 UI tokens and primitives; 2.6 seed (small profile).
- Phases 3 to 9 per `docs/decisions/advisor-plan.md`.
- `pnpm verify` skips migrate, seed, and Playwright/axe stages until WP 2.3, 2.6, 2.2/3.2.

## Blockers

- No Docker daemon: `docker-compose.yml` is unverified.
- `.github/workflows/ci.yml` has never run (no GitHub remote in this workspace).

## Gate log

### WP 2.1

Command: `pnpm install && pnpm typecheck && pnpm lint && scripts/db.sh start && pg_isready -p 54329` (exit 0). Output tail:

```
packages/fhir typecheck: Done
packages/ui typecheck$ tsc -p tsconfig.json
packages/shared typecheck: Done
packages/ui typecheck: Done

> carepath@0.0.0 lint /home/claude/carepath
> eslint . && prettier --check .

Checking formatting...
All matched files use Prettier code style!
127.0.0.1:54329 - accepting connections
/var/run/postgresql:54329 - accepting connections
```

`pnpm verify` also run: passed with migrate, seed, Playwright/axe stages SKIPPED.
