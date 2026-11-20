# CarePath progress

Date: 2026-11-19. Synthetic data only; not for clinical use.

## Completed

- WP 2.1 Monorepo, tooling, CLAUDE.md, scripts/db.sh, `pnpm verify` skeleton, compose file, CI workflow (gate output below).
- WP 2.5 Tokens, UI primitives, `/design-system` gallery, contrast test (gate output below).

## Outstanding

- WP 2.2 tooling probe; 2.3 schema and constraints; 2.4 API core; 2.6 seed (small profile).
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
### WP 2.5

Scope: `packages/ui` (tokens, Tailwind 4 preset, Radix-based and custom components), `apps/web/app/(public)/design-system`, `docs/design-system/` (README, components.md, screenshots). Command: `scripts/gate-wp-2.5.sh` (install, ui test, ui and web typecheck, eslint and prettier on the files this WP owns, web build, then `next start` in the background, Playwright with `/usr/bin/google-chrome` at 390, 768 and 1440, server stopped). Exit 0. Output tail:

```
 Test Files  2 passed (2)
      Tests  106 passed (106)
...

ok 390px: 14 sections, no console errors, no horizontal overflow, fonts loaded
ok 768px: 14 sections, no console errors, no horizontal overflow, fonts loaded
ok 1440px: 14 sections, no console errors, no horizontal overflow, fonts loaded
screenshots written to /home/claude/carepath/docs/design-system/screenshots/
WP 2.5 gate: PASSED
```

Screenshots: `docs/design-system/screenshots/` (gallery sections at 390, 768, 1440 in both themes, plus open dialog, side panel, bottom sheet, popover, menu and toast per theme). The script also fails on console errors, horizontal overflow and unloaded fonts; all three widths report ok.

Notes:

- `pnpm verify` was run and fails at lint and at the db test because of work in progress in `packages/db` by the concurrent worker (`packages/db/scripts/schema-engine.ts` lint error; missing migration file). Typecheck passed for every package including ui and web. Not caused by this WP; re-run once the db work lands.
- `pnpm-lock.yaml` is committed with this WP's changes and also contains the concurrent db worker's dependency changes.
- Playwright Chromium cannot be downloaded here (WP 2.2), so the screenshots use system Chrome 153 through `executablePath`. This is a version mismatch with Playwright 1.65; it ran without error.
- Not done: ESLint rule banning raw hex and arbitrary Tailwind values in `apps/web` (advisor plan risk 8) is not added; it touches shared lint config. Charts are not built; chart colour tokens exist and are contrast-tested. Screen-reader and keyboard behaviour were reviewed from Radix semantics and unit tests only, not by manual assistive-technology testing. No automated axe run yet (the plan adds it with the Playwright stage in WP 3.2).
