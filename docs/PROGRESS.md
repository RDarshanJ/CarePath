# CarePath progress

Date: 2026-11-19. Synthetic data only; not for clinical use.

## Completed

- WP 2.1 Monorepo, tooling, CLAUDE.md, scripts/db.sh, `pnpm verify` skeleton, compose file, CI workflow (gate output below).
- WP 2.5 Tokens, UI primitives, `/design-system` gallery, contrast test (gate output below).
- WP 2.6 Deterministic seed generator, small profile, full-profile parameter, demo accounts (gate output below).
- WP 2.3 Schema (37 tables), raw-SQL constraints, typed client, ERD and domain model (gate output below). Includes advisor plan revision 1 schema items.
- WP 2.4 API core: session auth, CSRF and CORS, role permission keys, org-scoped repositories, audit writer, error envelope, OpenAPI, rate limiting, PHI-safe logging, health check, Postgres job runner (gate output below).

## Outstanding

- WP 2.2 tooling probe.
- WP 2.4 items for C1: new dependencies and deviations in `docs/decisions/wp-2.4-api-core.md`.
- WP 6.3 tunes and times the `full` seed profile (the profile exists and runs, see WP 2.6 notes).
- Checkpoint C1 (schema, isolation and auth review) after WP 2.4.
- Phases 3 to 9 per `docs/decisions/advisor-plan.md`.
- `pnpm verify` skips the Playwright/axe stage until WP 2.2/3.2. The migrate and seed stages run.

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

### WP 2.6

Scope: `packages/db/seed/**` (generator, profiles, writer, integrity checks, checksums, CLI), `packages/db/test/seed.test.ts`, `packages/shared/src/password.ts` (scrypt helper, subpath export `@carepath/shared/password`), `docs/demo-accounts.md`, `pnpm db:seed`, seed stage in `scripts/verify.sh`, `scripts/gate-wp-2.6.sh`. Command: `scripts/gate-wp-2.6.sh` (migrate and seed the small profile twice in a scratch database, diff the per-table checksums, `db:seed --check`, typecheck, seed tests, eslint, prettier). Exit 0. Output tail:

```
  ExerciseSession              337  ec838c86d5d1939c6e21f324d676f44d
  SessionActivity             1343  87005f62164181b57412b3d89ca014e9
  PatientCheckIn               308  d70c37fa4580253dcc3304321c81c6d0
  AvailabilitySlot            2688  1fae44a53735eb09577754bde4bf7b04
  Appointment                   90  78515118c4db3c483d33d262710078d3
  Encounter                      8  0569ad6066855e8123cdecfd97abb16b
  ...
total rows: 6439
integrity checks: 65 passed
content-hash: dbe279915ca072144483c553cbd4113d028e2a1f689d111f685722a4a9d752cd
row checksums identical across two runs
seed check: 65/65 integrity checks passed
 Test Files  1 passed (1)
      Tests  12 passed (12)
All matched files use Prettier code style!
WP 2.6 gate: PASSED
```

`pnpm verify` also run after the WP: exit 0 (seed stage ran and printed the same content hash; packages/db 40 tests including 12 seed tests, packages/ui 106, apps/api 61; Playwright/axe stage SKIPPED).

Small profile row counts (seed `carepath-seed-1`, anchor 2026-11-19T16:00:00Z): Organization 2, User 49, OrganizationMembership 49, Patient 40, Practitioner 6, CareTeam 33, CareTeamMember 66, Consent 70, IntakeAssessment 40, Condition 30, Exercise 100 (50 library entries in each organization), CarePlan 33, CarePlanVersion 63, ExerciseAssignment 253, Goal 38, ExerciseSession 337, SessionActivity 1343, PatientCheckIn 308, AvailabilitySlot 2688, Appointment 90, Encounter 8, Observation 324, AIGeneration 9, ClinicalNote 8, ClinicalNoteVersion 14, AIReview 7, Conversation 21, ConversationParticipant 42, Message 72, Notification 82, ReviewRule 10, ReviewTask 41, AuditEvent 149, Job 14. Total 6439.

Full profile (parameter for WP 6.3, run once here, not tuned): 5 organizations, 30 therapists, 1,000 patients, exactly 2,000 appointments, 10,000 activity records, 50 encounters, 90 days of history; 68,936 rows, generated and written in about 5 seconds, 66 integrity checks passed. WP 6.3 still owns the timing gate, `pnpm seed:report` and any tuning.

Notes and deviations:

- Determinism: a seeded PRNG (mulberry32 over an FNV-1a hash, one forked stream per entity kind), ids from a SHA-1 based stable UUID, every timestamp derived from a fixed anchor (2026-11-19T16:00:00Z). No wall-clock or platform random calls in `packages/db/seed` (a test scans the sources). The content hash is over every table's rows as canonical JSON in primary-key order; the Role foreign key is replaced by the role key so it does not depend on database-assigned ids. `Role` and `StatusTransition` are reference data owned by migrations and are not touched.
- `pnpm db:seed` replaces all tenant data (TRUNCATE of every table except `Role`, `StatusTransition` and `_prisma_migrations`) inside one transaction, then runs the integrity checks before commit; a failed check rolls the seed back. It refuses a non-local database unless `CAREPATH_ALLOW_REMOTE_SEED=1`. It reads `DATABASE_URL`.
- Constraints: rows are inserted with their final status (the transition trigger is UPDATE-only). Two-step rows follow the application path: a care plan is inserted as `draft`, its versions and assignments are inserted, then it is updated to `active` with `currentVersionId` (and to `on_hold` or `completed` for inactive and discharged patients); a note is inserted as `draft`, versions are inserted, then it is signed, and amendments are inserted after signing. Appointments sit on an hourly grid per therapist, so the exclusion constraints hold by construction; the 2,688 availability slots cover the same grid.
- Password hash: `packages/shared/src/password.ts` (`scrypt$16384$8$1$<salt>$<hash>`, base64url). The API worker (WP 2.4) imports the same file, so there is one format. The seed uses a fixed salt so rows are reproducible, and every seeded login shares one demo password (documented in `docs/demo-accounts.md`).
- A "clinic" from brief section 18 is one Organization. The 50-entry exercise library is inserted into every organization (Exercise is a tenant table), so the small profile has 100 exercise rows and 50 distinct slugs. All exercise text is fictional and general, with the disclaimer in each description.
- The small profile has 2 coordinators and 2 administrators (one each per organization) in addition to the 6 therapists. Besides the four required accounts in organization 1 and the one in organization 2, the seed adds four scenario personas (resume, intake, noai, flare) so Scenarios A, C, D and F have a fixed account each.
- Clinic time zones are chosen without daylight saving (Phoenix, Honolulu, Regina, Puerto Rico) so local-hour arithmetic is a fixed offset.
- The "seeded now" is fixed, so as real time moves on, bookings after the anchor are in the past. Re-run `pnpm db:seed` (or pass `--anchor`) for a different fixed instant.
- Provisional shapes: `AIGeneration.output` and `input` JSON for note drafts and progress summaries, `IntakeAssessment.answers` and `ReviewRule.params` are plausible shapes, not the Zod contracts of WP 3.1 and 5.1. Regenerate the seed when those contracts land. `CarePlan.draftContent` is left null for the same reason.
- Edge-case minimums (one dead job, a failed message, a patient without AI consent, and so on) are asserted by the integrity checks. Most hold structurally for any seed; a few (for example cancellations by the clinic) hold for the default seed and nearly every other seed tried.
- `scripts/gate-wp-2.6.sh` seeds a scratch database, not the shared development database, and stops the cluster only if it started it, because other work packages may be using it. `pnpm verify` seeds the shared database as the plan requires.

### WP 2.4

Scope: `apps/api/**` (core, patients module, tests, OpenAPI script, committed `apps/api/openapi.json`), migration `packages/db/prisma/migrations/20261120120000_role_permissions`, root scripts `openapi:check` and `jobs:drain`, `scripts/gate-wp-2.4.sh`, `.prettierignore` (generated spec), `docs/decisions/wp-2.4-api-core.md`. Command: `scripts/gate-wp-2.4.sh` (api typecheck, eslint and prettier on apps/api, then the plan gate `pnpm --filter api test core` and `pnpm openapi:check`; starts Postgres if needed and stops it only if it started it). Exit 0. Output tail:

```
 RUN  v4.1.12 /home/claude/carepath/apps/api
 Test Files  10 passed (10)
      Tests  61 passed (61)
   Start at  23:04:11
   Duration  15.14s (transform 455ms, setup 0ms, import 3.77s, tests 10.07s, environment 1ms)
> carepath@0.0.0 openapi:check /home/claude/carepath
> pnpm --filter @carepath/api openapi:check
> @carepath/api@0.0.0 openapi:check /home/claude/carepath/apps/api
> tsx scripts/openapi.ts check
openapi: valid OpenAPI 3.1.0, 6 operations, house rules pass
WP 2.4 gate: PASSED
```

`pnpm verify` also run after the WP: exit 0 (seed stage ran; packages/ui 106 tests, packages/db 40, apps/api 61; build passed; Playwright/axe stage SKIPPED). Tail:

```
apps/api test:  Test Files  10 passed (10)
apps/api test:       Tests  61 passed (61)
==> build
==> start servers + Playwright + axe: SKIPPED (not implemented until WP 2.2 / WP 3.2)
verify: PASSED with skipped stages:
  - start servers + Playwright + axe [WP 2.2 / WP 3.2]
db: stopped
```

Endpoints: `GET /health` (database check, 503 when unreachable), `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`, `GET /roles` (admin, read-only matrix), `GET /patients/:patientId` (patient header, writes `phi.read`), `GET /docs/openapi.json`.

Tests (`apps/api/test/core`, `app.inject()` against the real Postgres): login cookie flags and session body; email normalisation; identical 401 for wrong password and unknown email, both audited; organization choice for multi-organization accounts; session rotation on login; logout revokes and audits; 30-minute idle and 12-hour absolute expiry; CSRF token missing, wrong-session, unlisted Origin, missing Origin, same-origin Referer, login CSRF; CORS preflight and refusal; Role rows equal the TypeScript permission map; 403 with a `security.access_denied` row for therapist, coordinator and patient on `/roles`; 401 before 403; cross-organization read and write answer 404 with an audit row; byte-identical 404 for missing and foreign ids (AC-I6); IDOR between two patients (AC-I2); malformed id 400 without lookup; clinician reads org-wide, writes only for care-team patients (403 `not_on_care_team` with an audit row); 429 with `Retry-After` on the 11th login and a per-IP global limit; error envelope for 400, 401, 404, 415, 500 and malformed JSON; security headers; client request id ignored; health 200 and 503; PHI canary (patient name, check-in text, pain value, email, password and cookie never in logs); OpenAPI 3.1 validity, operation ids, tags, `ErrorEnvelope` on every 4xx; job retry with exponential backoff then success; dead-letter after `maxAttempts` and manual requeue; drain; no double claim across six concurrent workers (SKIP LOCKED); stale-lock recovery; dedupe key; unhandled queues left alone.

Notes:

- New dependencies need advisor approval at C1: `zod`, `fastify-type-provider-zod`, `@fastify/swagger`, `@fastify/rate-limit`, `@fastify/cookie`, `@fastify/cors`, `openapi-types` (runtime) and `@apidevtools/swagger-parser` (dev). Details and every deviation are in `docs/decisions/wp-2.4-api-core.md`.
- Deviation: a failed login for an unknown email is audited with `actorType = system` and `metadata.anonymous = true`, because `AuditEvent_user_actor_check` requires a user id for `actorType = user`. Proposed for C1: an `anonymous` actor type.
- Password hashing comes from `@carepath/shared/password`, written by the WP 2.6 worker.
- `pnpm --filter @carepath/api start` runs through `tsx`; `node dist/server.js` cannot load `@carepath/db`, which exports TypeScript source.
- Concurrency note: the WP 2.6 seed truncates all tenant tables, and `pnpm verify` stops Postgres at the end. Running either while API tests run in another shell breaks those tests (seen once during this WP, then re-run clean). The API tests create their own organizations and never truncate.
- Not done here: AC-I1 enumeration across every patient-scoped route (waits for WP 3.1 routes), audit viewer endpoint (WP 6.1), per-route AI, export, import and booking rate limits (WP 4.1, 5.2, 5.4).
- A concurrent gate (for example the API worker's) that stops the shared Postgres cluster mid-run makes the seed tests fail with connection errors; re-run once the other gate has finished.
