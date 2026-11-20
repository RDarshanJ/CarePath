# CarePath progress

Date: 2026-11-19. Synthetic data only; not for clinical use.

## Completed

- WP 2.1 Monorepo, tooling, CLAUDE.md, scripts/db.sh, `pnpm verify` skeleton, compose file, CI workflow (gate output below).
- WP 2.5 Tokens, UI primitives, `/design-system` gallery, contrast test (gate output below).
- WP 2.6 Deterministic seed generator, small profile, full-profile parameter, demo accounts (gate output below).
- WP 2.3 Schema (37 tables), raw-SQL constraints, typed client, ERD and domain model (gate output below). Includes advisor plan revision 1 schema items.
- WP 2.4 API core: session auth, CSRF and CORS, role permission keys, org-scoped repositories, audit writer, error envelope, OpenAPI, rate limiting, PHI-safe logging, health check, Postgres job runner (gate output below).
- WP 2.2 Tooling probe (`docs/decisions/tooling-probe.md`). Accepted at checkpoint C1. Failures are recorded there as failures: the Playwright browser download and the HL7 packages are blocked; system Chrome 153 with Playwright 1.65.1 is an unverified version pairing.
- Checkpoint C1 (`docs/decisions/checkpoint-c1.md`): go for Phase 3, conditional on WP 3.0.
- WP 3.0 C1 must-fixes M1 to M7 plus the fixed-clock hook (gate output below).
- WP 3.1 API for Scenarios A to D: 51 operations (39 with an id in the path), contracts in `@carepath/shared/contracts`, job handlers for time-based rules and session abandonment, M8 enumeration test as the hard gate (gate output below).
- WP 3.2a Web foundation: `/api` rewrite, typed API helpers, TanStack Query provider, sign-in with demo mode, sign-out, role-guarded patient/clinician/admin shells, apps/web ESLint style ban, end-to-end stage in `pnpm verify` (gate output below).

## Outstanding

- WP 3.2b and 3.3, per C1 section 5. Route table: `docs/architecture/api-phase3.md`.
- WP 6.3 tunes and times the `full` seed profile (the profile exists and runs, see WP 2.6 notes).
- Phases 4 to 9 per `docs/decisions/advisor-plan.md` as amended by C1.
- PRD section 9 still differs from the schema; C1 section 3.7 assigns a pass to align it now that M2 has landed.
- Interim pages from WP 3.2a (Today, Progress, Overview, Patients, Review queue, Administration) are honest empty states; WP 3.2b, 3.3 and a later admin phase replace them.

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
- Provisional shapes: `AIGeneration.output` and `input` JSON for note drafts and progress summaries, `IntakeAssessment.answers` and `ReviewRule.params` are plausible shapes, not the Zod contracts of WP 3.1 and 5.1. Regenerate the seed when those contracts land. `CarePlan.draftContent` is left null for the same reason. (WP 3.1: `IntakeAssessment.answers` and review task evidence now follow the contracts and `ReviewRule.params` already matched them; the AI shapes wait for WP 5.1.)
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

### WP 3.0 (checkpoint C1 must-fixes)

Scope: `scripts/` (db.sh, gate-env.sh, with-web-lock.sh, verify.sh, test-db-concurrency.sh; gate-wp-2.4.sh and gate-wp-2.6.sh removed), migration `20261121000000_phase3_alignment`, `packages/db` (status rules, seed, tests), `packages/shared` (contracts, copy, enrollment-code helper), `apps/api` (contracts moved, TRUST_PROXY, withTx, database error mapping, no-emit build, fixed clock), `.github/workflows/ci.yml`, `docs/architecture/{api-phase3,erd,domain-model}.md`, `docs/decisions/contract-requests.md`, `docs/demo-accounts.md`, `.env.example`. Commands: `pnpm verify` and `scripts/test-db-concurrency.sh`, both exit 0, run from a stopped cluster.

| Item | Result |
|---|---|
| M1 concurrency | `db.sh` takes `CAREPATH_DB` and adds `acquire`, `release`, `drop` with flock leases in `.data/pg-leases`; `stop` and `reset` exit 3 while a lease is live unless `--force`; `release` stops only a cluster a lease started. `gate-env.sh` gives each gate its own database; `verify.sh` uses it (API 4090, web 3090) and builds under `with-web-lock.sh`. Acceptance run below |
| M2 schema | One migration: `anonymous` audit actor (no user, check), `SessionActivity.skipReason` (skipped only), `stopped_discomfort` with `stoppedAt` and transitions from `in_progress` and `paused`, `EnrollmentCode`, `Organization.phone` and `replyTimeText`, `enforce_same_parent` trigger for the six probed cases (one rejection test each) plus `reject_reparent`. Seed, integrity checks (72), status rules, ERD, domain model and demo accounts updated |
| M3 contracts | `@carepath/shared/contracts` (auth, errors, health, patients, permissions, roles), shared safety copy, `TRUST_PROXY=off|loopback`, route table `docs/architecture/api-phase3.md`, empty `docs/decisions/contract-requests.md` |
| M4 audit atomicity | `AuditWriter` takes a transaction client; `withTx(request, fn)`; login and logout use it. A forced audit failure leaves no changed row |
| M5 database errors | 23P01 `booking_conflict`, 23505 `already_exists`, CP001 `invalid_transition`, CP003 `rule_violation`, all 409 |
| M6 packaging | `tsx` in `apps/api` dependencies; `build` is `tsc --noEmit`; no `dist` |
| M7 CI and progress | CI seeds after migrate (CI itself has still never run); this file corrected for WP 2.2 |
| Clock (ruling 3.8) | `CAREPATH_FIXED_NOW` honoured outside production with one warning line; `pnpm db:seed --anchor now`; seed integrity checks pass on three anchors (Saturday 03:00, Monday 20:00, Wednesday 06:00 UTC) |

`pnpm verify` (exit 0). Tail:

```
==> gate environment
db: started by lease 31047
db: lease 31047 acquired (database carepath_verify_31047)
==> migrate
==> seed (small profile)
integrity checks: 72 passed
content-hash: b804588a0c023bb7f43757f77fefbb2016d04751e1a724a60e34696e8bef241f
==> typecheck
==> lint
==> unit + API tests
packages/ui test:       Tests  106 passed (106)
packages/db test:       Tests  58 passed (58)
apps/api test:       Tests  86 passed (86)
==> build
==> start servers + Playwright + axe (runs under scripts/with-web-lock.sh): SKIPPED (not implemented until WP 3.2a)
verify: PASSED with skipped stages:
  - start servers + Playwright + axe (runs under scripts/with-web-lock.sh) [WP 3.2a]
db: stopped
db: lease 31047 released
```

M1 acceptance, `scripts/test-db-concurrency.sh` (exit 0): one process holds a lease on `carepath_hold`, `stop` and `reset` are refused, two `pnpm verify` runs start together and both pass, then the cluster is still up, `carepath_hold` is untouched and no `carepath_verify_*` database remains. Output:

```
db: started by lease 32046
db: lease 32046 acquired (database carepath_hold)
holder: lease held by pid 32046, marker row written to carepath_hold
db: refusing, live leases held by pid(s): 32046. Use --force to override.
db: refusing, live leases held by pid(s): 32046. Use --force to override.
stop and reset refused with exit 3 while leased
verify A exit 0: database: carepath_verify_32152
verify: PASSED with skipped stages:
  - start servers + Playwright + axe (runs under scripts/with-web-lock.sh) [WP 3.2a]
db: lease 32152 released
verify B exit 0: database: carepath_verify_32125
verify: PASSED with skipped stages:
  - start servers + Playwright + axe (runs under scripts/with-web-lock.sh) [WP 3.2a]
db: lease 32125 released
127.0.0.1:54329 - accepting connections
carepath_hold untouched: hold_marker = held
no carepath_verify_* database remains
db: dropped carepath_hold
db: stopped
db: lease 32046 released
last release stopped the lease-started cluster
concurrency acceptance: PASSED
```

Both verify runs printed the same content hash and the same test counts (ui 106, db 58, api 86).

Seed after M2 (small profile, default seed and anchor): 6449 rows (6439 before plus 10 `EnrollmentCode` rows), 72 integrity checks, content hash `b804588a0c023bb7f43757f77fefbb2016d04751e1a724a60e34696e8bef241f` (was `dbe27991…52cd`). Session statuses: 307 completed, 16 stopped for discomfort, 11 abandoned, 3 paused.

Notes and deviations:

- `withTx` takes the Fastify request, not the bare `ctx`, because the audit event needs the request id, route template and IP hash. It passes `ctx` (null on public routes) to the callback.
- `EnrollmentCode` has a `label` column (last four characters of the normalised code) for staff lists; codes are matched after removing spaces and upper-casing (`@carepath/shared/enrollment-code`). Codes belong to an organization, not to a patient.
- `ExerciseSession.stoppedAt` was added so a stopped session does not reuse `completedAt`.
- `reject_reparent` (not asked for) keeps the same-patient checks from being undone by changing a parent's `patientId` or a session's `carePlanVersionId` after the fact.
- The seed guarantees at least one clinic-cancelled appointment for any anchor; before, it held only for most anchors (two of six tried failed).
- `scripts/gate-wp-2.4.sh` and `scripts/gate-wp-2.6.sh` were removed rather than converted; their checks run inside `pnpm verify`. `gate-wp-2.5.sh` runs its build and `next start` under the web lock but does not use a database.
- API tests pin `allowedOrigins` so a gate's `CORS_ORIGINS` does not change them.
- Prisma interactive transactions over `@prisma/adapter-pg` 7.10.1 print a `pg` deprecation warning ("client.query() when the client is already executing a query") from inside Prisma's query interpreter. Queries are still queued in order under `pg` 8; `pg` 9 removes that queueing, so a `pg` upgrade needs a Prisma adapter that awaits each query.
- Not done: no Next.js rewrite or web code (owned by WP 3.2a); no Phase 3 endpoints or their contracts beyond the names in the route table (WP 3.1); CI still never run.

### WP 3.1 (API for Scenarios A to D)

Scope: `packages/shared/src/contracts/**` (all Phase 3 contracts, error codes), `packages/shared/src/copy.ts` (exercise notice, pain notice), `packages/db/src/status.ts` (`initialStatus`), `packages/db/seed` (intake answers and task evidence in contract shapes), `packages/db/test/initial-status.test.ts`, `apps/api/**` (modules today, care-plans, sessions, check-ins, progress, clinic, overview, records, exercises, review, onboarding, intake, consents, care-team; core time, pagination, people, scope helpers, auth `openSession`; job handlers and scheduler), `apps/api/openapi.json`, `scripts/gate-wp-3.1.sh`, `docs/architecture/api-phase3.md`. Commands: `scripts/gate-wp-3.1.sh` (exit 0) and `pnpm verify` (exit 0).

Endpoints, in delivery order (commits f73b0a7 contracts, 2579ef4, 1879658, 637a6fd, 793c95a, dfb31de, cd901ef, dfceaf7):

1. Patient reads: `GET /patients/:id/today`, `/care-plan`, `/care-plan/versions`, `/care-plan/versions/:versionId`, `POST .../versions/:versionId/acknowledge`, `GET /sessions`, `/sessions/:sessionId`, `/check-ins`, `/check-ins/:checkInId`, `/progress`, `/clinic`.
2. Session and check-in writes: `POST /sessions` (start), `/sessions/:id/pause`, `/resume`, `PUT /sessions/:id/activities/:activityId` (complete or skip with reason), `POST /sessions/:id/stop` (stopped for discomfort), `/complete`, `POST /check-ins` (pain Observation and the pain rule in one transaction).
3. Clinician reads: `GET /overview`, `/patients` (directory), `/patients/:id/timeline`, `/record-history`, `/exercises`, `/review-tasks`, `/patients/:id/review-tasks`.
4. Plan builder: `GET|PUT /patients/:id/care-plan/draft`, `GET .../draft/preview`, `POST .../publish`.
5. Review: `POST /patients/:id/review-tasks/:taskId/assign|resolve|dismiss`, `POST /patients/:id/check-ins/:checkInId/review`, `GET /review-rules`, `PUT /review-rules/:ruleId`; job queues `review.time_rules`, `sessions.abandon_idle`.
6. Onboarding: `POST /onboarding/accounts`, `GET /patients/:id/intake`, `PUT .../intake/steps/:step`, `POST .../intake/submit`, `GET|POST /patients/:id/consents`, `POST .../consents/:consentId/revoke`, `GET /practitioners`, `GET /patients/:id/care-team`, `POST .../care-team/assignments`.

`scripts/gate-wp-3.1.sh` (exit 0). Tail:

```
==> seed (small profile)
integrity checks: 72 passed
content-hash: 1efaec778240da9c9f4a9aa3379b5e8c40dec9cf2b5b47cf1271257952c9f407
==> typecheck (shared, db, api)
==> lint (paths owned by WP 3.1)
==> format (paths owned by WP 3.1)
All matched files use Prettier code style!
==> db tests
 Test Files  6 passed (6)
      Tests  61 passed (61)
==> API tests
 Test Files  22 passed (22)
      Tests  160 passed (160)
==> OpenAPI check
openapi: valid OpenAPI 3.1.0, 51 operations, house rules pass
WP 3.1 gate: PASSED
db: lease 12103 released
```

`pnpm verify` (exit 0), run on a clean worktree of commit d531739 because WP 3.2b and 3.3 had uncommitted edits in the shared checkout (one of them failed lint there). Tail:

```
packages/ui test:       Tests  106 passed (106)
packages/db test:       Tests  61 passed (61)
apps/api test:       Tests  160 passed (160)
==> build
==> end-to-end (API + next start + Playwright + axe)
  26 passed (41.2s)
verify: PASSED
db: lease 13986 released
```

API tests added (99 of the 160): `test/phase3/patient-reads` 11, `sessions` 13, `clinician-reads` 11, `care-plan` 13, `review` 11, `onboarding` 10, `m8-enumeration` 5 (each enumerating 39 operations under three passes and 4 roles). Covered: AC-A1 to A5, A8 (API side), B1 to B7, C1 to C4, C6, C2 (patient and clinician progress responses are equal), D1 to D7, H1, I1, I2, I6; concurrent session start and concurrent publish (one wins, one 409); job handlers scoped by `job.organizationId` (another organization's rows untouched, a job without an organization refused).

**M8 hard gate.** `apps/api/test/phase3/m8-enumeration.test.ts` reads the real app's OpenAPI document and calls every operation with an id in its path (39): (1) as each organization B role with organization A ids, expecting 404 with the byte-identical body and a `security.access_denied` event, or 403 `forbidden`, with at least one role reaching the scope check; (2) as patient 2 with patient 1's ids; (3) with patient 1's id over patient 2's child ids (session, activity, check-in, task, version, consent). A path parameter or request body without a fixture fails the test. GET routes without path ids are checked for leaked organization A ids.

Proof that it fails on unscoped routes. Three routes were added to `apps/api/src/modules/sessions/routes.ts` for one run and then removed (the file was restored from a copy; the test passes 5 of 5 again): `GET /patients/:patientId/sessions/:sessionId/unscoped` (patient checked, session by bare id), `GET /proof/sessions/:sessionId` (no scope) and `GET /patients/:patientId/notes/:noteId` (no fixture). First run, all three present: 4 of 5 failed, starting with `Error: GET /patients/{patientId}/notes/{noteId}: no fixture for path parameter {noteId}`. Second run, without the no-fixture route: 2 of 5 failed:

```
× answers 404 with a security event to organization B for every organization A id (AC-I1)
+   "GET /proof/sessions/{sessionId} as B patient: 200 {\"id\":\"2e99974f-...\"}",
+   "GET /proof/sessions/{sessionId} as B therapist: 200 {\"id\":\"2e99974f-...\"}",
+   "GET /proof/sessions/{sessionId}: no organization B role reached the scope check",
× finds child ids only under their own patient
+   "GET /patients/{patientId}/sessions/{sessionId}/unscoped as A patient: 200 {...\"status\":\"in_progress\"}",
+   "GET /patients/{patientId}/sessions/{sessionId}/unscoped as A therapist: 200 {...}",
+   "GET /patients/{patientId}/sessions/{sessionId}/unscoped: no role reached the child scope check",
      Tests  2 failed | 3 passed (5)
```

Seed after WP 3.1 (small profile, default seed and anchor): intake answers keyed by the contract steps (`personal_information` ... `review`; the intake persona stops at `pain_levels`), review task evidence carries value, threshold and unit. 72 integrity checks; content hash `1efaec778240da9c9f4a9aa3379b5e8c40dec9cf2b5b47cf1271257952c9f407` (was `b804588a…f241f`). Smoke run against the seeded database with the fixed clock: `patient.demo` Today is `due` with version 3 and an unacknowledged plan change; `patient.resume` Today is `paused`; `therapist.demo` overview has 8 caseload patients, 9 open tasks, 11 unreviewed check-ins, 3 with missed activity; all 18 open tasks carry a value and threshold.

Notes and deviations:

- Cursors are opaque offsets over a total order (every ORDER BY ends with the id), not keysets. Clients never build them, so the encoding can change without a contract change.
- Query schemas carry no `.meta({ id })`: `@fastify/swagger` cannot expand a named query schema into parameters. The names stay in TypeScript.
- Two contract domains beyond the route table's list: `overview` and `records`, plus `common`. One route beyond it: `GET /patients/:id/check-ins/:checkInId` (the pain task's source link, AC-D1). One error code beyond it: `plan_not_published` (409, session start with no published version).
- Plan-change acknowledgement uses the `care_plan_published` notification's `readAt`; publish creates that notification. No schema change.
- The plan draft is stored as `{ content, editedByPractitionerId }`, so the draft has an author without a new column.
- Assigning a task moves it to `in_review`, unassigning to `open`. Resolving clinical-rule tasks needs `review_task.resolve` and the care team; administrative-rule tasks need `review_task.resolve_admin`.
- The contact notice is shown at the clinic threshold even when the pain rule is disabled; only the task depends on `enabled`.
- A session start covers the exercises scheduled for today in the organization's zone, or the whole plan on an unscheduled day.
- Session, check-in and intake writes have no audit event of their own: PRD section 13 lists the event names and none fits. They still run in one transaction through `withTx`. Every event the route table lists (`account.create`, `consent.grant`, `consent.revoke`, `careplan.publish`, `review_task.resolve`, `review_rule.update`, `assignment.create`) commits with its change.
- Body ids outside the caller's scope (a check-in's `sessionId`, a stop's `activityId`, draft exercise and goal ids, an assignee) answer 400 on that path; path ids answer 404.
- Account creation audits failures as `account.create` with `minor_failure`, an anonymous actor and a detail code.
- `account_exists` tells a holder of a valid eligibility code that an email is registered. Accepted from the route table; the code check runs first and the route is rate limited like login.
- Jobs: a 15-minute scheduler in the API process enqueues one job per organization and queue with a dedupe key per slot. `apps/api/src/jobs/repo.ts` lists organization ids, the only cross-organization read, and reads no tenant content.
- Not done: Turbopack resolution of `.js` imports inside `@carepath/shared` (WP 3.2a builds with webpack). Switching the contracts to extensionless imports is possible but not done here.

### WP 3.2a

Command: `scripts/gate-wp-3.2a.sh` (ports 4032 and 3032, database `carepath_wp32_<pid>`), and `pnpm verify` (ports 4090 and 3090). Output tail of the end-to-end stage:

```
==> end-to-end (API + next start + Playwright + axe)
Running 26 tests using 1 worker
  ✓  4 [mobile-390] › patient: signs in, stays in its own shell, is refused the others, signs out
  ✓  6 [mobile-390] › physical_therapist: signs in, stays in its own shell, is refused the others, signs out
  ✓  8 [mobile-390] › care_coordinator: signs in, stays in its own shell, is refused the others, signs out
  ✓ 10 [mobile-390] › clinic_admin: signs in, stays in its own shell, is refused the others, signs out
  (same 13 tests again at desktop-1440)
  26 passed (41.2s)
verify: PASSED
```

`pnpm verify` ran in a clean worktree of the commit: migrate, seed (72 integrity checks), typecheck, lint, tests (ui 106, db 58, api 97, web 16), build, end-to-end, exit 0, no skipped stages. Note: in the working tree at that moment, lint failed on files owned by WP 3.1 (`packages/shared/src/contracts/*.ts` committed unformatted in f73b0a7, and in-flight API files); the worktree run formatted the contracts without committing it. WP 3.1 must run `pnpm format` on its files.

What the tests cover: each of the four roles signs in by form and by the demo button, lands in its shell, sees only the working nav items, is redirected away from the other two shells, is refused by the API for a permission it lacks, signs out, and is then refused again. axe (wcag2a, 2aa, 21a, 21aa, 22aa) runs on every page visited at 390 and 1440 wide and fails on serious or critical findings. Screenshots: `docs/screenshots/3.2a/`.

Notes and deviations:

- Care coordinators and clinic administrators both use the admin shell (`/admin`), because they have no `clinical.read` (C1 ruling 3.7) and the clinician overview needs it. Only physical therapists use the clinician shell.
- The web build uses webpack (`next build --webpack`) with an `extensionAlias` for `.js` to `.ts`: Turbopack failed to resolve `./auth.js` inside `@carepath/shared`. Switching contracts to extensionless imports would let Turbopack back in.
- The `/api` rewrite destination is fixed at build time from `API_PORT` (or `API_ORIGIN`). A gate must build with the API port it will run with.
- The ESLint style rule exempts `app/(public)/design-system/**`, which predates it and uses a few arbitrary layout values. `apps/web/test/style-rule.test.mjs` proves 11 violations fail and token classes pass.
- Observed: the Next rewrite forwards `X-Forwarded-For`, so with `TRUST_PROXY=loopback` the login rate limit is per client address (two clients behind one proxy were limited separately). The e2e API raises the login limit to 500 per minute because the suite signs in about 50 times from one address.
- Not exercised end to end: the client-side `session_expired` redirect (no page issues a client query yet; the fixed API clock cannot idle out a session). The server-side guard, the expired notice and the sign-out-with-dead-session path are tested.
- Interim pages are empty states, not stubs with fake data; they exist because the shells must show their nav items.
- No contract requests were needed.
