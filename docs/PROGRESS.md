# CarePath progress

Date: 2026-11-19. Synthetic data only; not for clinical use.

## Completed

- WP 2.1 Monorepo, tooling, CLAUDE.md, scripts/db.sh, `pnpm verify` skeleton, compose file, CI workflow (gate output below).
- WP 2.5 Tokens, UI primitives, `/design-system` gallery, contrast test (gate output below).
- WP 2.3 Schema (37 tables), raw-SQL constraints, typed client, ERD and domain model (gate output below). Includes advisor plan revision 1 schema items.

## Outstanding

- WP 2.2 tooling probe; 2.4 API core; 2.6 seed (small profile).
- Checkpoint C1 (schema, isolation and auth review) after WP 2.4.
- Phases 3 to 9 per `docs/decisions/advisor-plan.md`.
- `pnpm verify` skips seed and Playwright/axe stages until WP 2.6 and 2.2/3.2. The migrate stage now runs.

## Blockers

- No Docker daemon: `docker-compose.yml` is unverified.
- `.github/workflows/ci.yml` has never run (no GitHub remote in this workspace).
- `binaries.prisma.sh` is blocked, so the Prisma CLI cannot download its native schema engine. Migrations run through Prisma's WebAssembly schema engine instead (see WP 2.3 notes). `prisma migrate` itself is unverified here.

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

### WP 2.3

Scope: `packages/db/**` (schema, migrations, client, status rules, error helpers, migration CLI, tests), `docs/architecture/erd.md`, `docs/architecture/domain-model.md`, migrate stage in `scripts/verify.sh` and CI, root `db:migrate` script, ESLint restriction on `@carepath/db/client`. Command: `pnpm db:reset && pnpm --filter db test` (exit 0). The test script applies migrations, runs the schema/migration drift check, then vitest. Output tail:

```
> @carepath/db@0.0.0 test /home/claude/carepath/packages/db
> tsx scripts/schema-engine.ts deploy && tsx scripts/schema-engine.ts check && vitest run
applied: 20261120053016_init, 20261120053116_constraints
schema.prisma matches the migration history
 RUN  v4.1.12 /home/claude/carepath/packages/db
 Test Files  3 passed (3)
      Tests  28 passed (28)
```

Tests (verbose run) include the three the plan requires: overlapping appointment rejected (practitioner and patient, SQLSTATE 23P01), cross-organization foreign key rejected (23503), illegal status transition rejected (CP001). Also: 10 concurrent inserts for one time give exactly one success, back-to-back and cancelled-then-rebooked times allowed, overlapping availability slots rejected, duplicate MRN per organization rejected (23505) but allowed across organizations, one open care plan and one primary therapist (partial unique), message sender must be a participant, care plan cannot point at another plan's version, AuditEvent UPDATE and DELETE rejected (CP002), published CarePlanVersion immutable, pain score range, patient change note required from version 2, gapless version numbers, only the author signs and signed notes only take amendments, one profile per user, encounter needs a visit that took place, StatusTransition table equals `src/status.ts`, typed Prisma client reads relations and surfaces 23P01.

`pnpm verify` also run after the WP: exit 0 (migrate stage runs; packages/db 28 tests, packages/ui 106, apps/api 1; seed and Playwright/axe stages SKIPPED). Database stopped afterwards.

Notes and deviations:

- Prisma 7.10.1 (exact pins: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg` 8.23.1). Prisma 7 needs a driver adapter, so `@prisma/adapter-pg` and `pg` are new runtime dependencies of `@carepath/db`. Dev-only additions: `@prisma/schema-engine-wasm` (engine commit of prisma 7.10.1), `@prisma/driver-adapter-utils`, `tsx`, `vitest`, `@types/pg`. These need advisor sign-off at C1.
- Migrations run through `packages/db/scripts/schema-engine.ts` (Prisma's WebAssembly schema engine), because the Prisma CLI's native engine download is blocked. Files and `_prisma_migrations` use Prisma's format. The script works around three `@prisma/adapter-pg` gaps (script splitting on `;`, shadow pool connecting to the main database, `"char"` columns). `prisma generate` runs with `PRISMA_SCHEMA_ENGINE_BINARY` pointed at a stub because generation never uses the engine. Root `package.json` lists `prisma` and `@prisma/engines` under `pnpm.ignoredBuiltDependencies` so their download scripts never run.
- ADR-9 says the exclusion constraints apply `WHERE status = 'booked'`. They apply to every non-cancelled status (requested, booked, checked_in, in_progress, completed, no_show), per the WP 2.3 task, so a completed or no-show visit still blocks its time.
- Status transitions are enforced on UPDATE only. INSERT accepts any status so the seed can write history directly.
- `AuditEvent` hash chain not implemented (stretch per advisor plan revision 1).
- `Role` rows are inserted by the constraints migration with empty permission lists; WP 2.4 owns the permission keys.
- Added tables beyond brief section 11: `Condition` (revision 1), `CareTeamMember`, `SessionActivity`, `ConversationParticipant`, `ReviewRule`, `ClinicalNoteVersion`, `AuthSession` (ADR-7), `Job` (ADR-4), `StatusTransition`.
