# CarePath progress

Date: 2026-11-20. Synthetic data only; not for clinical use.

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
- WP 3.2b Patient experience: onboarding (account, code, nine steps, consent, review), Today, guided session with persistence and stop flow, Progress with SVG charts and table alternatives, Sharing and consent, care plan (gate output below).
- Checkpoint C2 (`docs/decisions/checkpoint-c2.md`): the slice is real; go for Phase 4 after WP 3.4.
- WP 3.4a (branch `wp/3.4a`): S1 shared data root for every worktree, F3 session-keyed rate limit with forwarded client address, F4 contracts (CR-2 `onCareTeam`, CR-3 `total`, draft `{ draft: null }`, `mediaAlt`, corrected descriptions), F5 gate fails when a run changes `docs/` (gate output below).
- WP 3.4b (branch `wp/3.4b`): F1 `/admin/patients` with Assign therapist, onboarding link, sticky staff rail, `PatientShell` removed, C2 patient fixes (1.5.1 to 1.5.4), `e2e/slice.spec.ts`, CR-4 illustrations wired (gate output below).
- WP 3.4c (branch `wp/3.4c`): clinician fixes from C2 (F2 intake on the record and in the builder, 1.6.1 to 1.6.7, CR-2 and CR-3 consumed, flaky axe test fixed); gate output below.
- WP 4.2 (branch `wp/4.2`): messaging API (five routes), delivery job with failed state and retry, unread counts from participant read markers, audited coordinator read via `message.org`, M8 fixtures (gate output below).
- WP 4.1 (branch `wp/4.1`): scheduling. Migration `phase4_scheduling` (appointment matches its slot), six routes (slots, patient appointments, book, cancel, reschedule, clinician day for CR-1), `TodayView.nextAppointment`, 24-hour in-app reminder job, the 50-parallel booking test (20 of 20), care-team thread created on assignment, M8 fixtures (gate output below).
- WP 5.1 (branch `wp/5.1`): AI pipeline in `packages/ai` (ADR-5, ADR-6): provider interface, deterministic provider, optional Anthropic provider over `fetch`, versioned prompts, strict output schemas with source references, consent gate, rate-limit hook, redaction with an outbound canary, timeout and bounded retry, token and cost record, evidence verifier interface, injection set, `pnpm ai:eval` (gate output below). Includes WP 5.5's 25 cases after opus review.
- WP 5.4 batch 1 (branch `wp/5.4`): `@carepath/fhir` mappers for Organization, Practitioner, Patient, CarePlan (one per published version), Goal, Observation; collection Bundle export; three validation layers (Medplum `validateResource`, CarePath checks, duplicates); import planning with itemised OperationOutcome; `GET /patients/:patientId/fhir/export` and `POST /fhir/import`; `pnpm synthea:demo` and three committed Synthea patient bundles plus the practitioner bundle; `docs/evaluation/fhir-validation.md`. Official HL7 validation not performed (package hosts blocked). Batch 2 followed in WP 5.4b (gate output below).
- WP 5.4b FHIR batch 2 (branch `wp/5.4b`): mappers for Condition, Appointment, Encounter (visits that took place, AMB or VR) and DocumentReference (one per signed ClinicalNoteVersion: the signed version docStatus final, each amendment docStatus amended with relatesTo replaces, LOINC 11506-3 or 34117-2, custodian = clinic; drafts are never read); Goal.addresses and Observation.encounter now written; batch 2 checks (con-3/4/5, app-1 to app-4, per-1, us-core-6, custodian, export rules for visits and signed notes); import allow-list adds Encounter and Condition (Appointment and DocumentReference export only, skipped and listed); 24 new broken fixtures (55 of 55 fail with the expected rule); `scripts/fhir-export-check.ts` exports every seeded patient (40 of 40 pass); `pnpm synthea:demo` re-run (bundles identical; 47 encounters, 54 conditions now imported, re-import 409 with 42 duplicates); `docs/evaluation/fhir-validation.md` updated for all ten resources. Official HL7 validation still not performed (gate output below).
- D-WP-1 tokens, type and capture tooling (branch `wp/d1`): DR-001 colour set as one map for both themes (all roles including link, selected, critical, accent, AI, `chart-1..8`, `seq-1..7`, `div-1..5`), patient and clinician type scales and `textExtra` roles, IBM Plex Sans 400/400 italic/500/600 and Plex Mono 400 with Source Serif 4 removed, scrim and overlay shadow on `ink`, token tests rewritten per DR-001 section 8, `apps/web/scripts/design-capture.mjs` with its probe, and the tokens-only capture in `docs/design/after/d-wp-1/` (gate output below).

- WP 5.2 (branch `wp/5.2`): AI progress summaries and SOAP note drafts through `@carepath/ai` with a SQL evidence resolver, stored generations and append-only reviews, gated approval, note draft from approval, sign, amendment and entered in error, consent refusal, failure path, overview AI drafts; CR-7, CR-8 and CR-16 delivered as demo rules pending clinical governance review (gate output below).
- WP 5.6a (branch `wp/5.6a`, checkpoint C3 fixes in `packages/ai`): A1 empty progress summary as `progress_summary@1.1.0` (1.0.0 unchanged and still pinned); A2 verifier allow-list of input records with reason `not_in_input`, passed by the pipeline; A3 a redaction token left after restore is `invalid_output`; A4 Anthropic `stop_reason: max_tokens` is `invalid_output`, named as truncation, not retried, and its tokens counted; A5 the three C3 3.2 statements in the eval report, re-run with `pnpm ai:eval` (gate output below).
- WP 5.6b (branch `wp/5.6b`, checkpoint C3 fixes B1 to B8): migration `20261126000000_phase5_c3_fixes` (`note.mark_entered_in_error` for `clinic_admin`, partial unique index one signed note per encounter); entered in error decided by permission with a header-only answer for a caller without `clinical.read`; FHIR export reads signed notes only; `encounter_already_documented`; staff names to the redactor; stored `inputRefs` passed to the verifier on read and at approval, with `not_in_input` and `inInput` in the contract; generated-output labels without "AI" and `DEMO_PROVIDER_NOTICE`; CR-18 and CR-19 delivered (gate output below).


## Outstanding

- CR-4 follow-ups: `moment-nothing-to-review` is in `public/assets/illustrations` but not yet shown (the queue empty state is `Empty` in `(clinician)/_components/common.tsx`, more than a one-line change; use `MomentImage` from `apps/web/components/illustration.tsx`). The plan builder preview in `(clinician)/_components/plan-view.tsx` does not yet show exercise pictures; use `IllustrationFigure` and `exerciseIllustration`. The patient `/plan`, session overview and session player do.
- WP 3.3 is committed by its own worker; WP 3.2b is listed above. Route table: `docs/architecture/api-phase3.md`.
- WP 6.3 tunes and times the `full` seed profile (the profile exists and runs, see WP 2.6 notes).
- Seed NPIs (WP 6.3, `packages/db/seed/people.ts`): the fictitious `9…` NPIs fail the us-core-17 check digit. Since WP 5.4b the FHIR export leaves such an NPI out (staff identifier kept); on main before 5.4b merges, exporting a seeded patient whose plans or observations name such a practitioner answers 500. Generating check-digit-valid `9…` values would let the export carry them.
- WP 5.4b depends on WP 5.2 only by reading. `scripts/gate-wp-5.4b.sh` was re-run on branch `wp/5.6b` after WP 5.2 merged (exit 0, `GATE_SKIP_VERIFY=1`; WP 5.6b's own gate ran `pnpm verify`); since WP 5.6b an entered-in-error note is not exported at all.
- Phases 4 to 9 per `docs/decisions/advisor-plan.md` as amended by C1.
- PRD section 9 still differs from the schema; C1 section 3.7 assigns a pass to align it now that M2 has landed.
- Interim pages from WP 3.2a (Today, Progress, Overview, Patients, Review queue, Administration) are honest empty states; WP 3.2b, 3.3 and a later admin phase replace them.
- Checkpoint C3: review the WP 5.2 schema change (migration `phase5_ai_review`), the approval gate and note rules (demo rules pending clinical governance review), and the two audit event names outside PRD section 13.
- The live provider (`CAREPATH_ANTHROPIC_*`) has never been run; its tests use an injected `fetch`. Its price is configuration; without it cost is recorded as null and labelled. A live run stays stretch (C2, C3).
- `docs/evaluation/ai-eval.md` numbers are not yet in `docs/evaluation/metrics.json` (WP 8.1 owns that file); `ai-eval.json` beside the report is the raw output of the recorded run.

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

### WP 3.3

Command: `scripts/gate-wp-3.3.sh` (ports 4033 and 3033, own database via gate-env). Stages: migrate, seed (72 integrity checks), typecheck, eslint and prettier on the owned paths, web build, then the clinician Playwright specs at desktop-1440 (1440x900) with axe, then `pnpm verify` (see the note below). Tail of the end-to-end stage:

```
Running 5 tests using 1 worker
  ✓  1 [desktop-1440] › e2e/clinician-cross-role.spec.ts › a plan published by the clinician reaches the patient with its change note (4.8s)
  ✓  2 [desktop-1440] › e2e/clinician-keyboard.spec.ts › plan builder works by keyboard alone, with visible focus and Escape closing overlays (6.5s)
  ✓  3 [desktop-1440] › e2e/clinician-scenario-b.spec.ts › Scenario B: draft, autosave, reorder, preview, publish version 2 with a note, history (8.1s)
  ✓  4 [desktop-1440] › e2e/clinician-scenario-d.spec.ts › Scenario D: a threshold check-in becomes one task the clinician reviews and resolves (5.8s)
  ✓  5 [desktop-1440] › e2e/clinician-screens.spec.ts › clinician screens: content, axe and screenshots at 1440 and 1024 (24.6s)
  5 passed (50.8s)
WP 3.3 gate: PASSED
```

`pnpm verify` in the working tree (which also holds WP 3.2b's uncommitted patient work): migrate, seed, ui 106, db 61, api 160 tests passed, build, then end-to-end 39 passed and 2 failed. Both failures are in `apps/web/e2e/patient.spec.ts` (WP 3.2b, in flight): the mobile-390 "session flow works by keyboard alone" and the desktop-1440 axe check on consent. Every clinician spec passed inside that run. The verify exit code is therefore owned by 3.2b until those two are fixed.

Screens: overview, patients directory, patient record (overview, plan, activity, check-ins, history tabs), care plan builder, review queue. Screenshots at 1440 and 1024: `docs/screenshots/3.3/`.

Deviations and notes:

- `scripts/e2e.sh` takes an optional `E2E_ARGS` passthrough so a gate can run a subset of specs; without it behaviour is unchanged.
- "Visits today" is derived from the directory (`hasUpcomingAppointment`), because there is no appointments endpoint (CR-1). The queue is clinic-wide, so assign and resolve can return 403 `not_on_care_team` (CR-2). The directory has no total count, so pagination shows page position only (CR-3). See `docs/decisions/contract-requests.md`.
- The clinician filter uses `/practitioners`, falling back to Me and Anyone.
- Below 1280px the exercise library and the review task detail open as drawers.
- The shell's left rail (`components/shells.tsx`, owned by 3.2a) is not sticky and scrolls away on long pages. Not edited.
- The cross-role test changes only Noel Noaipatient's data. Scenario D adds one check-in for Noel. Other tests choose patients by rule, because seed names vary between runs.

### WP 3.2b

Command: `scripts/gate-wp-3.2b.sh` (exit 0). Output tail:

```
  ✓   7 [mobile-390] › e2e/patient.spec.ts:627:3 › read-only screens › progress, plan, consent and the contact card, with axe (10.3s)
  ✓   8 [mobile-390] › e2e/patient.spec.ts:698:3 › read-only screens › a signed-out visitor can open onboarding and nothing else in the patient app (1.7s)
  -   9 [desktop-1440] › e2e/patient.spec.ts:74:3 › Scenario A: onboarding › a new patient completes onboarding with a code, with resume, validation and consent
  -  10 [desktop-1440] › e2e/patient.spec.ts:299:3 › Scenario A: onboarding › a returning patient resumes at the first open step with earlier steps intact
  -  11 [desktop-1440] › e2e/patient.spec.ts:329:3 › Scenario C: guided session › Today leads with one action; the session completes, resumes after reload and ends with a check-in
  -  12 [desktop-1440] › e2e/patient.spec.ts:483:3 › Scenario C: guided session › Stop, this hurts ends the session, shows the clinic notice and asks for a pain report
  -  13 [desktop-1440] › e2e/patient.spec.ts:541:3 › Scenario C: guided session › the session flow works by keyboard alone
  -  14 [desktop-1440] › e2e/patient.spec.ts:600:3 › read-only screens › Today at 200 percent zoom keeps its action and does not scroll sideways
  ✓  15 [desktop-1440] › e2e/patient.spec.ts:627:3 › read-only screens › progress, plan, consent and the contact card, with axe (10.8s)
  ✓  16 [desktop-1440] › e2e/patient.spec.ts:698:3 › read-only screens › a signed-out visitor can open onboarding and nothing else in the patient app (1.6s)

  6 skipped
  10 passed (1.5m)

WP 3.2b gate: PASSED
db: stopped
db: lease 14915 released
exit=0
```

Screenshots: `docs/screenshots/3.2b/` (390 and 1440). Open item: CR-4 in `docs/decisions/contract-requests.md`.

### WP 3.4a (checkpoint C2: S1, F3, F4, F5)

Worktree `/home/claude/wt/3.4a`, branch `wp/3.4a`. Both gates were run there after the last code commit; `git status --porcelain` was empty afterwards.

`scripts/gate-wp-3.1.sh` (exit 0):

```
==> seed (small profile)
integrity checks: 72 passed
content-hash: d55864495170783e355170c91c52c81f9ff4c8b8daef0f79285509fdef600b27
==> db tests
 Test Files  6 passed (6)
      Tests  63 passed (63)
==> API tests
 Test Files  22 passed (22)
      Tests  165 passed (165)
==> OpenAPI check
openapi: valid OpenAPI 3.1.0, 51 operations, house rules pass
WP 3.1 gate: PASSED
```

`pnpm verify` (exit 0):

```
database: carepath_verify_24886
data root: /home/claude/carepath/.data
integrity checks: 72 passed
content-hash: d55864495170783e355170c91c52c81f9ff4c8b8daef0f79285509fdef600b27
packages/ui test:       Tests  106 passed (106)
packages/db test:       Tests  63 passed (63)
apps/api test:       Tests  165 passed (165)
==> end-to-end (API + next start + Playwright + axe)
  11 skipped
  41 passed (3.5m)
==> docs/ unchanged by the run
verify: PASSED
```

S1 acceptance, `scripts/test-db-concurrency.sh /home/claude/wt/3.4a-twin` (a second, temporary worktree of `wp/3.4a`, removed afterwards; exit 0):

```
data root: /home/claude/carepath/.data (verify A in /home/claude/wt/3.4a, verify B in /home/claude/wt/3.4a-twin)
stop and reset refused with exit 3 while leased
verify A exit 0: database: carepath_verify_11134
verify B exit 0: database: carepath_verify_11126
127.0.0.1:54329 - accepting connections
carepath_hold untouched: hold_marker = held
no carepath_verify_* database remains
concurrency acceptance: PASSED
```

Notes:

- S1. `scripts/data-root.sh` resolves `CAREPATH_DATA_ROOT` (default: `.data` beside the main checkout, from `git rev-parse --git-common-dir`). `db.sh`, `gate-env.sh` and `with-web-lock.sh` use it, so every worktree shares one cluster, one lease directory and one web lock. End-to-end logs and screenshots stay in the worktree's own `.data`. The web lock serialises build and end-to-end across worktrees, which is why every worktree can use the `pnpm verify` ports 4090 and 3090.
- The first acceptance attempt failed verify A at "docs/ unchanged by the run", because I edited `docs/decisions/contract-requests.md` in that worktree while it ran. That is F5 working. It also left its lease holder running; the test now stops the holder on any exit and clears the stale pid file.
- F3. The global limiter keys on `session:<id>` when the request has a valid session and `address:<ip>` otherwise. The plugin runs as a route-level hook, after the access hook has loaded the session. Sign-in and account creation keep their per-address limits. `serverGet` forwards `x-forwarded-for` (Next sets it to the incoming header or the connection address) and `x-request-id`; the API still issues its own request id (`requestIdHeader: false`). New API tests: the default limit of 300 answers 429 with `Retry-After` for one session; two sessions behind the proxy are limited separately, and a request without a session from the same address has its own budget.
- Ruling 3.5. The end-to-end suite passes at the default global limit, so `RATE_LIMIT_GLOBAL_PER_MINUTE=6000` is removed from `scripts/e2e.sh`. Measured from the API log of one full run: 867 requests, at most 265 in any 60 seconds for one user, 82 for requests without a session. The margin is about 12 percent; a suite that grows by a few signed-in screens per minute will reach it. `RATE_LIMIT_LOGIN_PER_MINUTE=500` stays.
- F4. `ReviewTask.onCareTeam` (every task response) and `PatientHeader.onCareTeam` (`null` for the patient and roles without clinical.read); `total` on `PatientDirectoryPage` and `ReviewTaskPage`; `GET /patients/:patientId/care-plan/draft` answers 200 `CarePlanDraftResult` (`{ draft: null }` with no draft); `mediaAlt` on every exercise shape, with column `Exercise.mediaAlt` and check `Exercise_media_alt_with_path` (migration `20261122000000_exercise_media_alt`); overview tasks described as caseload only, `assignedSessions` as week to date. `openapi.json` regenerated. No route was added, so the M8 fixtures needed no change. The seed content hash changed with the new column: `d55864495170783e355170c91c52c81f9ff4c8b8daef0f79285509fdef600b27`.
- Web changes kept to what compiles and behaves: `reads.draft` returns `CarePlanDraft | null`, and the builder and the plan tab read `null` as "no draft" instead of a 404. No screen uses `onCareTeam` or `total` yet (WP 3.4c).
- F5. `scripts/e2e.sh` fingerprints `docs/` before and after Playwright and fails on any change outside an explicit `SCREENSHOT_DIR`; without one, screenshots go to `.data/e2e-screenshots`. `verify.sh` always sends screenshots to `.data/verify-screenshots` and fails when `docs/` was clean before the run and is not after.
- One end-to-end flake seen in seven runs of the suite: `clinician-screens.spec.ts`, axe `document-title` on the review queue at 1024 with the task drawer open. The rerun passed. Owned by WP 3.4c (clinician specs).
- `CLAUDE.md` still says the cluster data is in `.data/pg`; with S1 it is `$CAREPATH_DATA_ROOT/pg`. Not edited here.

### WP 3.4c (checkpoint C2: clinician fixes)

Worktree `/home/claude/wt/3.4c`, branch `wp/3.4c`. Gate: `scripts/gate-wp-3.4c.sh` (API 4036, web 3036; new in this package, modelled on the 3.3 gate; screenshots to `docs/screenshots/3.4c/` through `SCREENSHOT_DIR`). Then `pnpm verify` in the same worktree after the code commit, with `docs/` unchanged by the run.

Done:

- F2. Overview tab section "What the patient told us at intake" from `GET /patients/:patientId/intake`: goal, body area and side, the three pain numbers labelled patient-reported, limitations, therapist preferences, availability, submitted time (or what is still unanswered). "See intake" in the plan builder header opens the same content in a drawer. A patient with no intake shows "No intake on file".
- 1.6.1. The four-card row on the Overview tab is one summary strip.
- 1.6.2. Review queue is a table with 36 px rows (asserted in the spec) and a sticky detail pane at 1280 and wider; below that the task opens in a drawer as before. Status appears only when a task is not open, in the queue, the detail and the overview list.
- CR-3. Directory footer reads "Patients 1 to 25 of N" from `total`; the queue heading count is `total`, with "Showing x of N" when more pages exist.
- CR-2. With `onCareTeam` false the queue disables assign, mark check-in reviewed, and (for clinical tasks) resolve and dismiss, and says why beside them. The patient record disables "Open care plan builder" with the reason, the builder shows an explanation instead of an editor, and the check-ins tab disables "Mark reviewed". The 403 handling stays as the backstop.
- Wording. Overview lists are called caseload ("Your review tasks"); the queue description says it is the whole clinic. Filtered empty states in the queue and directory say "No tasks match these filters" and offer "Clear filters". The raw `resolved` and `in_review` enums on the timeline are words. "Visits today" is "Next visits today" until WP 4.1. Publishing an empty plan is disabled with a visible reason.
- Flaky axe `document-title` failure (clinician-screens at 1024 with the task drawer open): the cause is the document title updating after client navigation, so axe could run before it. The spec now waits for the task to appear in the address and for the title before every axe call, so the order is deterministic.

TODO (illustration): the "nothing-to-review" illustration at `apps/web/public/assets/illustrations/moment-nothing-to-review*.webp` comes with WP 3.4b. The queue empty state does not depend on it; use it there once 3.4b has merged.

Gate (`GATE_SKIP_VERIFY=1 scripts/gate-wp-3.4c.sh`, exit 0):

```
==> pnpm --filter @carepath/web typecheck
==> pnpm exec eslint (clinician paths)
==> pnpm exec prettier --check (clinician paths)
==> scripts/with-web-lock.sh scripts/e2e.sh
  6 passed (1.3m)
WP 3.4c gate: PASSED
```

`pnpm verify` (exit 0):

```
packages/ui test:       Tests  106 passed (106)
packages/db test:       Tests  63 passed (63)
apps/api test:       Tests  165 passed (165)
==> end-to-end (API + next start + Playwright + axe)
  12 skipped
  42 passed (3.9m)
==> docs/ unchanged by the run
verify: PASSED
```

Screenshots: `docs/screenshots/3.4c/` (1440 and 1024), including `review-queue-task-1440.png`, `review-queue-1024.png`, `record-overview-1440.png`, `plan-builder-intake-1440.png`.

### WP 3.4b (checkpoint C2: F1, 1.4.2 to 1.4.5, 1.5.1 to 1.5.4, slice test, CR-4 wiring)

Worktree `/home/claude/wt/3.4b`, branch `wp/3.4b`, rebased onto master at `bcf9f25` (3.4c merged) before the final run. `scripts/gate-wp-3.4b.sh` (ports 4035 and 3035, includes `pnpm verify`) exit 0; `git status --porcelain` empty afterwards.

```
integrity checks: 72 passed
content-hash: 3d64c8b5500f1437d10e1c486620c88f6772306910d102a886e8c5e254eafaed
packages/db test:  Tests  63 passed (63)
gate e2e (slice patient auth, both widths):  7 skipped, 37 passed (3.2m)
pnpm verify: packages/ui 106, packages/db 63, apps/api 165 tests passed
  e2e: 13 skipped, 43 passed (4.2m)
==> docs/ unchanged by the run
verify: PASSED
WP 3.4b gate: PASSED
```

- F1: `/admin/patients` (coordinator and administrator home). Administrative directory, default status "Awaiting assignment", search, status filter, cursor paging with the API total. Patients with unsubmitted intake say what is missing and have no action. "Assign therapist" opens a dialog listing `/practitioners` with caseload and posts the assignment. No clinical field is shown. Nav has one item, "Patients". `/admin` redirects there; sign-in cards no longer say screens arrive later (administrator card says settings, metrics and audit still do).
- 1.4.2 to 1.4.5: "New patient with an eligibility code? Start here." on sign-in; staff rail sticky (aside stretches and carries the border, inner rail sticks and is capped at window height); `PatientShell` deleted; clinician screenshots written only when `SCREENSHOT_DIR` is set; 93 duplicate PNGs removed from `docs/screenshots/3.3`.
- 1.5.1 to 1.5.4: version 1 reads "Your plan is ready" with no change list; Sessions at 390 are stacked rows (table from 640); charts never draw wider than their 360 px viewBox so text stays caption size; "planned so far this week" on Today and Progress. Added `scroll-padding-bottom` in the patient app layout so a focused control is not hidden by the tab bar.
- `e2e/slice.spec.ts` (desktop project, code `CAREPATH-1-START-2`): onboarding at 390, coordinator assignment in the UI, therapist builds and publishes version 1, patient sees "Your plan is ready", completes the session and reports pain 8, therapist finds exactly one open "Reported pain" task (API) and sees it in the queue.
- CR-4 delivered. 19 accepted WebP files (960 and 480) in `apps/web/public/assets/illustrations`, trimmed manifest `docs/design-system/asset-manifest.json` (prompts, model, dimensions, bytes, licensing "not verified"). Seed sets `mediaPath` and `mediaAlt` for all 50 exercises: own picture for six (knee-to-chest, pelvic-tilt, standing-trunk-rotation, deep-breathing, mini-squat, marching-in-place), body-area picture for the rest. Shown in the session player, session overview, care plan and the onboarding body-area step, each with the caption "Illustration only. Follow the written steps from your care team." `moment-done-for-today` and `moment-details-with-clinic` are on Today (decorative, empty alt). Content hash changed to the value above. Generated illustrations, not medically reviewed.
- Seed touch outside ownership: `packages/db/seed/careplans.ts` (two lines) and new `packages/db/seed/data/exercise-media.ts`.
- Screenshots: `docs/screenshots/3.4b/` (390 and 1440): `slice-01` to `slice-09`, `admin-*`, `a05-body-area`, `a13-today-awaiting`, `c01-today-due`, `c03-exercise`, `c10-today-done`, `c11-progress`, `c12-progress-tables`.

### WP 4.2 (messaging API)

Worktree `/home/claude/wt/4.2`, branch `wp/4.2`, code commit `ffa2d96`. `scripts/gate-wp-4.2.sh` (API port 4042, own database, includes `pnpm verify`) exit 0; `git status --porcelain` empty afterwards. No schema change and no contract request: the message tables were enough.

```
seed check: 72/72 integrity checks passed
messaging tests:  Tests  17 passed (17)
M8 enumeration:   Tests  5 passed (5)
API tests (all):  Test Files 23 passed, Tests 182 passed (182)
openapi: valid OpenAPI 3.1.0, 56 operations, house rules pass
pnpm verify: packages/ui 106, packages/db 63, apps/api 182 tests passed
  e2e: 43 passed (4.3m)
==> docs/ unchanged by the run
verify: PASSED
WP 4.2 gate: PASSED
```

- Routes: `GET /conversations`, `GET /conversations/:conversationId/messages`, `POST /conversations/:conversationId/messages`, `POST /conversations/:conversationId/read`, `POST /conversations/:conversationId/messages/:messageId/retry`. Contracts in `packages/shared/src/contracts/messaging.ts`; module in `apps/api/src/modules/messaging`.
- One helper, `requireConversation` (`access.ts`): participants read and write; a coordinator (`message.org`) may read a thread they are not in, which writes a `phi.read` event (resource `Conversation`, patient, detail `message_org`); everyone else, including a clinician on the patient's care team who is not in the thread, gets the byte-identical 404 and `security.access_denied`. Clinic administrators have no messaging permission (403).
- Messages are created `queued` (`initialStatus.Message`) with a `messages.deliver` job in the same transaction. The handler is scoped by `job.organizationId`, marks `sent`, or `failed` with a plain reason when delivery is forced to fail (`MESSAGE_FORCE_FAILURE=true`, ignored in production; `createJobHandlers({ forceMessageFailure })` for tests) or when the last attempt errors. Only the sender sees a queued or failed message and can retry it (`failed -> queued`, new job); the recipient never sees it.
- Unread = messages from others, `sent`, with `sentAt` after the caller's `lastReadAt`, computed in SQL. Sending does not move the sender's marker. Delivery time is set later than every delivered message and read marker in the thread, and `createdAt` is strictly increasing per conversation, so counts and order stay right under a fixed clock (`CAREPATH_FIXED_NOW`).
- Contract edits outside messaging, for merge: `TodayView.messages` (`{ unreadCount, unreadConversations }`, one line after `week`) in `today.ts`, `ClinicianOverview.messages` (same shape, after `missedActivity`) in `overview.ts`, and one export line in `contracts/index.ts`. Also `insertJob` now accepts a transaction client (`core/jobs/repo.ts`).
- Not built, by the brief: no route creates a conversation, so a patient without a seeded thread has nothing to write in; coordinators who are not participants cannot send. Both need a decision (see the reply to the orchestrator).

### WP 4.1 (scheduling)

Worktree `/home/claude/wt/4.1`, branch `wp/4.1`, rebased onto master `18a3e1b` (WP 4.2 merged). `scripts/gate-wp-4.1.sh` (API port 4041, own database, includes `pnpm verify`, ends with `git status --porcelain` empty). Gate run before the rebase, exit 0:

```
==> pnpm --filter @carepath/db exec vitest run test/phase4-scheduling.test.ts --reporter=verbose
      Tests  8 passed (8)
==> booking concurrency results
repetitions=20 parallel=50 all exactly one 201: true wall ms min=154 median=224 max=579
==> scheduling.test.ts + m8-enumeration.test.ts
      Tests  22 passed (22)
openapi: valid OpenAPI 3.1.0, 57 operations, house rules pass
integrity checks: 76 passed
content-hash: 29a76b82dc8b92fc82675477a6e41a3d5474b4af4b5da5df2d3422f763a98e1a
pnpm verify: packages/ui 106, packages/db 71, apps/api 183 tests passed
  e2e: 43 passed (4.0m)
verify: PASSED
==> git status --porcelain
(clean)
WP 4.1 gate: PASSED
```

Final gate run after the rebase and the care-team thread work, at commit `73719c7`, exit 0:

```
      Tests  8 passed (8)          (phase4_scheduling trigger tests)
repetitions=20 parallel=50 all exactly one 201: true wall ms min=157 median=252 max=614
      Tests  25 passed (25)        (scheduling, assignment-thread, M8)
openapi: valid OpenAPI 3.1.0, 62 operations, house rules pass
integrity checks: 77 passed
content-hash: 7edce4a5344f971ecaf7aa71abfa583b619048c373ea2325e0f73d974b76e742
pnpm verify: packages/ui 106, packages/db 71, apps/api 203 tests passed
  e2e: 43 passed (4.1m)
==> docs/ unchanged by the run
verify: PASSED
(clean)
WP 4.1 gate: PASSED
```

Per-repetition counts and timings of both runs: `docs/evaluation/booking-concurrency.md`.

- Migration `20261123000000_phase4_scheduling` (SQL only, `schema.prisma` unchanged, `migrate:check` passes): trigger `Appointment_matches_slot` (`enforce_appointment_slot`, CP003) on INSERT and UPDATE of `slotId`, `practitionerId`, `startsAt`, `endsAt`: same practitioner, start not before the slot, end not after it; trigger `AvailabilitySlot_keeps_appointments` (CP003) refuses moving a slot out from under its appointments; partial index `Appointment_reminder_due_idx`. The one-live-appointment-per-slot index (`Appointment_slot_live_key`, status not cancelled) and the exclusion constraints already existed in the constraints migration and are kept. Tests: `packages/db/test/phase4-scheduling.test.ts` (one rejection per condition, UPDATE paths, slot side, live-slot index).
- Routes (`apps/api/src/modules/scheduling`, contracts `packages/shared/src/contracts/scheduling.ts`, table in `docs/architecture/api-phase3.md` section 10): `GET /practitioners/:practitionerId/slots`, `GET /patients/:patientId/appointments`, `POST /patients/:patientId/appointments`, `POST .../appointments/:appointmentId/cancel`, `POST .../appointments/:appointmentId/reschedule`, `GET /appointments?date&practitionerId` (CR-1). Patients book only with a therapist on their active care team (400 `not_care_team_practitioner`) and see slots only of those therapists (404); coordinators (`appointment.manage`) book, cancel and reschedule for anyone in the organization; therapists and admins read only. New error code `slot_unavailable` (409, past or blocked slot). Audit `appointment.book` and `appointment.cancel` in the same transaction.
- Booking: `SELECT ... FOR UPDATE` on the slot, `open -> booked`, insert in `initialStatus.Appointment`; cancel reopens the slot in the same transaction; reschedule is cancel plus book in one transaction with `rescheduledFromId` (AC-E7 test: original unchanged when the new slot is taken). Booking transactions get `maxWait` 15 s and `timeout` 20 s through a new optional `TxOptions` argument on `withTx`/`inTransaction`.
- AC-E5: test with a New York clinic across the 2027-03-14 change, slots grouped by clinic day, a 23:30 local slot dated to the local day.
- Reminder job `scheduling.appointment_reminders`, recurring every 15 minutes per organization, handler scoped by `job.organizationId`: one `appointment_reminder` notification per booked visit starting within 24 hours, claimed through `reminderSentAt` in the same transaction (rerun writes nothing).
- `TodayView.nextAppointment` (next `booked` or `checked_in` visit not yet ended).
- Seed: no `requested` appointments any more (C1 ruling 3.3; the random draw is kept so other rows do not move, the row is `booked`); new integrity checks (non-cancelled appointments match their slot, sit on a booked slot, every seeded appointment has a slot, no `requested`).
- Care-team thread (orchestrator ruling after WP 4.2 merged): `POST /patients/:patientId/care-team/assignments` now creates the patient's care-team conversation in the same transaction when there is none (subject `CARE_TEAM_THREAD_SUBJECT` in `@carepath/shared`), adding patient, assigned therapist and the care team's active coordinators as participants, idempotently (`ensureCareTeamConversation` in `modules/care-team/repo.ts`; patient row lock from the status update serialises two assignments). Test `apps/api/test/phase4/assignment-thread.test.ts` (refused assignment creates nothing; participants; reassignment reuses the thread). The seed adds the coordinator as a participant (read) of assigned patients' threads and creates an empty care-team thread for every assigned patient with a login that had none; integrity check "every assigned patient with a login has a care-team thread with their therapist". Seed after this: 77 integrity checks, content hash `7edce4a5344f971ecaf7aa71abfa583b619048c373ea2325e0f73d974b76e742`. Coordinators stay read-only (audited) on threads they are not in.
- Merge notes for the orchestrator: shared files touched with minimal edits: `contracts/index.ts` (one export line), `contracts/today.ts` (`nextAppointment` after WP 4.2's `messages`), `contracts/errors.ts` (`slot_unavailable`), `app.ts` (one registration line), `jobs/handlers.ts` (one handler, one recurring queue), `modules/today/routes.ts` (one field), `core/db/repo.ts` and `core/db/tx.ts` (optional `TxOptions`), `core/scope/repo.ts` and `patient-scope.ts` (`Appointment` child kind, `requirePractitioner`), `m8-enumeration.test.ts` (scheduling fixtures beside the messaging ones), `shared/src/copy.ts` (thread subject), `modules/care-team`. `openapi.json` regenerated after the rebase (62 operations). `ClinicianOverview` not touched (CR-1 is a second call).
- Fix in WP 4.2 files: `messaging.test.ts` failed 3 of 4 runs after the rebase on participant role order. Participants were ordered by `joinedAt` only and the test fixture gave them equal times. `test/support/fixtures/messaging.ts` now spaces `joinedAt` by 1 ms in the given order. `modules/messaging/repo.ts` is unchanged (an `id` tie-break inside its `as const` select does not type-check); participants with equal `joinedAt` still have no defined order there, worth a look by the messaging owner.


### WP 4.3a (patient appointments and messages)

Worktree `/home/claude/wt/4.3a`, branch `wp/4.3a`. `scripts/gate-wp-4.3a.sh` (API 4043, web 3043, own database, includes `pnpm verify`) exit 0 and the tree clean afterwards (the screenshot folder is excluded from that check because its pictures change with each run; they are committed after the gate).

```
seed check: 77/77 integrity checks passed
stage 1  patient-scheduling (Scenario E at 390 and 1440, two-browser, keyboard):  4 passed (1.2m)
stage 1b patient.spec + auth.spec (navigation now four destinations):             36 passed (2.9m)
stage 2  patient-messaging-failure (API with MESSAGE_FORCE_FAILURE=true):         2 passed (34.2s)
pnpm verify: packages/ui 106, packages/db 71, apps/api 203 tests passed
  e2e: 47 passed, 17 skipped (4.9m)
verify: PASSED
(clean)
WP 4.3a gate: PASSED
```

- Screens (all under `apps/web/app/(patient)/(app)`): `/appointments` (upcoming and past, reminder banner, booked/moved/cancelled confirmation), `/appointments/book` (therapist profile, visit type, day and time-of-day filters preselected from intake, open times grouped by clinic-zone day with the zone named, check and confirm), `/appointments/[id]/reschedule`, cancel dialog with a required reason, `/messages` (list with unread and failed-count text), `/messages/[conversationId]` (sender name and role on every message, composer with reply-time text and `EMERGENCY_NOTICE`, Sending/Sent/Not sent with Retry, 5 second poll while open, read marker moved on open). Today gained Next appointment and Messages sections in REQ-TOD-01 order and an appointment reminder line. Nav: four destinations, bottom tabs under md, header row from md up (one visible "Patient" landmark at a time), unread badge from the 30 second conversation poll.
- Booking conflict: `booking_conflict` shows "That time was just taken", refreshes the list, keeps visit type and filters, and offers the three nearest open times (AC-E8). The two-browser test uses `patient.demo` and `patient.resume` against one slot.
- Tests: `e2e/patient-scheduling.spec.ts`, `e2e/patient-messaging-failure.spec.ts` (runs only with the flag); `patient.spec.ts` and `auth.spec.ts` nav assertions updated. Everything a test books is cancelled again. Screenshots: `docs/screenshots/4.3a` (e01 to e11, each at 390 and 1440).
- Deviations and notes: (1) Times are shown in the clinic zone, named, not the viewer zone (as the work package says; REQ-APT-03 wording says viewer zone). (2) The reminder is derived on Today and Appointments from `nextAppointment` being today or tomorrow in the clinic zone; no API route lists the stored `appointment_reminder` notifications. (3) The API answers `booking_conflict` also when the patient has an overlapping visit, so that case reads "That time was just taken" too. (4) Forced failure: the flag is set at API start, so the retried message fails again; recovery from failed to sent after a retry is covered by the WP 4.2 API tests, and the normal Sending to Sent path by Scenario E. (5) The e2e axe check removes the sticky phone tab bar's stickiness during the scan, because axe counts controls under it as too small; the bar itself is scanned on screens where nothing sits beneath it. (6) The tab bar wraps to two rows at 200 percent zoom (195 px). (7) Shared files touched: none outside `(patient)`, the two patient e2e specs and the new gate script. The patient column is `max-w-3xl` (was `2xl`) so the header nav fits.

### WP 4.3b (clinician agenda and messages)

Worktree `/home/claude/wt/4.3b`, branch `wp/4.3b`, rebased onto master after WP 4.3a merged (`4107513`). `scripts/gate-wp-4.3b.sh` (API 4044, web 3044, own database, ends with `git status --porcelain` empty apart from the re-recorded screenshots) exit 0:

```
integrity checks: 77 passed
messaging tests (phase4/messaging):  Tests  18 passed (18)
clinician-schedule-messages, desktop-1440:  6 passed (35.4s), 1 skipped (failed delivery)
failed delivery and retry, API with MESSAGE_FORCE_FAILURE=true:  1 passed (14.4s)
pnpm verify: packages/ui 106, packages/db 71, apps/api 204 tests passed
  e2e: 53 passed (5.2m)
verify: PASSED
(clean)
WP 4.3b gate: PASSED
```

- Schedule (`/schedule`): the signed-in practitioner's day from `GET /appointments?date&practitionerId`, as a table in start order (no grid, no drag). Date stepper (Previous day, Today, Next day, a date field), `?date=` in the address, the clinic zone named in the page text, cancelled visits listed struck through with a status tag, status tag only when not "Booked" (booked rows carry it as screen-reader text). Empty day says what is true of that day.
- Overview: "Visits today" now reads the same agenda (replaces "Next visits today"); count is non-cancelled visits and the copy says how many cancelled ones are left out. New "Unread messages" section from `ClinicianOverview.messages`.
- Patient record: new Appointments tab (`?tab=appointments`), upcoming and past and cancelled, from `GET /patients/:id/appointments`, read-only (booking belongs to patient and coordinator).
- Messages (`/inbox`, nav label "Messages" with an unread count): conversation list with unread and "not sent" text chips, thread with sender name and role on every message, "You" on own messages, composer with reply-time text and the emergency notice from the API (the shared constant), Ctrl+Enter sends, queued shows "Sending", failed shows the plain reason and "Try again", opening a thread marks it read. Polling per ADR-12: open thread 5 s (1.5 s while one of your messages is queued), list 10 s, nav count 15 s.
- Nav: Schedule and Messages added to the clinician rail. Leftovers from 3.4b: plan preview shows exercise illustrations with the caption (`IllustrationFigure` / `exerciseIllustration`); the review queue's true empty state uses `moment-nothing-to-review`.
- API fix: `apps/api/src/modules/messaging/repo.ts` participant order is `joinedAt` then `id` (typed `Prisma.ConversationParticipantOrderByWithRelationInput[]`, outside the `as const` select, so it type-checks); test "lists participants with equal joinedAt in id order".
- Deviations: (1) The clinician Messages route is `/inbox`, not `/messages`: WP 4.3a owns `(patient)/(app)/messages` and Next refuses two pages on one path. (2) Edits outside `(clinician)/**`: `apps/web/components/shells.tsx` (two nav items and the unread count on Messages, clinician shell only) and one assertion in `apps/web/e2e/auth.spec.ts` (clinician nav links now include Schedule and Messages). (3) The failed-delivery spec needs the API started with `MESSAGE_FORCE_FAILURE=true`; the gate runs it in a second e2e pass and it skips in `pnpm verify`. With delivery forced to fail, a retry ends failed again; retry-to-sent is covered by the WP 4.2 API tests. (4) The empty-queue picture is checked by answering the queue route with an empty page inside the test (no seeded clinic has an empty queue). (5) The agenda e2e books through the API as the patient (the booking screens are 4.3a's). (6) Screenshots are not byte-identical between runs, so the gate's clean-tree check excludes `docs/screenshots/4.3b`; the committed PNGs are the last run's. (7) No clinician conversation-creation or coordinator messaging UI: coordinators are read-only and sit in the admin shell, outside this package.
- Screenshots (`docs/screenshots/4.3b/`, 1440 and 1024 unless noted): `schedule-today`, `schedule-empty-day` (1440), `overview-visits`, `record-appointments`, `messages-list`, `messages-thread`, `messages-failed` (1440), `plan-preview-illustrations` (1440), `review-queue-empty` (1440).

### WP 5.1 (AI pipeline, deterministic provider, evidence verifier, redaction)

Worktree `/home/claude/wt/5.1`, branch `wp/5.1`, with `wp/5.5` merged (25 cases). Gate `scripts/gate-wp-5.1.sh`: exit 0 (second run; the first failed once in `pnpm verify` on `e2e/slice.spec.ts`, see the note below, and a standalone `pnpm verify` then passed):

```
==> schema validity (output schemas, eval case schema)      Tests  7 passed (7)
==> timeout, bounded retry, backoff, consent, rate limit, cost record   Tests  16 passed (16)
==> prompt-injection set                                     Tests  48 passed (48)
==> redaction and outbound canary                            Tests  9 passed (9)
==> evidence verifier                                        Tests  4 passed (4)
==> all packages/ai tests                                    Tests  104 passed (104)
==> eval cases match EvalCase v1                             25 valid, 0 invalid
==> eval smoke run (scratch output)
25 cases, 25 schema-valid, 0/181 unsupported, 146/195 facts recalled, injection followed 0/4
==> pnpm verify
packages/ui 106, packages/ai 104, packages/db 71, apps/api 204 tests passed
  25 skipped
  53 passed (5.0m)
==> docs/ unchanged by the run
verify: PASSED
==> git status clean
WP 5.1 gate: PASSED
```

- Flaky test outside this package (not changed here): `apps/web/e2e/slice.spec.ts:188` waits for an `h1` "Care plan builder", but `(clinician)/patients/[patientId]/plan/builder.tsx` shows that heading only while loading or on error and "Care plan for <name>" once loaded, so the test passes only when it catches the loading state. Suggested fix for the web owner: match `/Care plan (builder|for)/`, or wait for "Care plan for".

- Module (`@carepath/ai`): `generate({kind, input, provider, consent, requester, rateLimit?, resolver?, timeoutMs=20000, maxRetries=2, backoffMs=500})` returns a `GenerationRecord` (provider, label, model, prompt key and version, input refs, output or null, error, per-call records, token and cost totals, redaction counts, verification, unsupported count). Refusals throw `AIError` before any provider call: `consent_required`, `rate_limited`, `invalid_input`, `redaction_failed`. Failures after the last retry return `status: "failed"` with no output (AC-F2).
- Schemas: `ProgressSummaryOutput` {summary, reportedChanges, engagementObservations, itemsForReview: Statement[]; missingInformation: {item, label}[]; notices} and `SoapNoteDraftOutput` {subjective, objective, assessment, plan: Statement[]; missingInformation: {section, item, label}[]; notices}. `Statement` = {id `sN`, text, sourceRefs [{type, id, field}]}; transcript turns are cited as field `transcript.turn.<n>`. All objects strict; duplicate statement ids are invalid output.
- Providers: `DeterministicProvider` (label "Demo provider, rule-based", model null, zero tokens and cost with label "No model call: demo provider, rule-based, zero cost"); `AnthropicProvider`/`anthropicProviderFromEnv` (no SDK, `fetch`, accepts only `RedactedText`).
- Eval (`pnpm ai:eval`, deterministic provider, 25 reviewed cases, recorded in `docs/evaluation/ai-eval.md` and `.json`): structured-output validity 25 of 25; unsupported-statement rate 0 of 181; expected-fact recall 146 of 195 (74.9%), any section 155 of 195; citation accuracy of recalled facts 146 of 146; missing-information precision 55 of 75, recall 55 of 58; injection probes 4: 4 in schema, 0 followed, 4 with a notice. These describe a rule set, not a model, and three changes were made after reading the cases: sentence-level injection handling, two injection patterns, and the strength coverage rule (disclosed in the report; checkpoint C3 section 3.2).
- Case review: all 25 read; five fixed (06, 13, 19 forbiddenOutputs; 13, 14, 16 facts), none dropped; log in `packages/ai/evals/data/REVIEW.md`, embedded in the report.
- Dependencies: `zod`, `vitest`, `tsx` added to `packages/ai` at the versions already pinned elsewhere in the workspace (no new package in the lockfile; own commit). No Anthropic SDK.
- Deviations: (1) The brief's `statements[]` is not a separate array; each section is an array of statements with sourceRefs, and `listStatements()` flattens them, so no statement is stored twice. (2) `summary` is required by the schema to hold at least one statement (`packages/ai/src/schemas.ts`), and the demo provider writes summary statements only from sessions, check-ins and a published plan. A window with none of the three fails as `invalid_output` after three attempts. Correction after checkpoint C3 section 1.1; WP 5.6a (A1) makes `summary` optional. Gaps go to `missingInformation`, never into unsourced statements. (3) Cost uses configured prices only (`CAREPATH_ANTHROPIC_INPUT_USD_PER_MTOK`, `..._OUTPUT_...`); no price table in code. (4) Redaction also tokenises calendar dates and record UUIDs for external calls and restores them in the output. (5) Consent is checked inside the pipeline as well as by the API (defence in depth); the API still owns the audit. (6) Root `package.json` gained the `ai:eval` script; `docs/decisions/contract-requests.md` gained CR-5 (the case format).
### WP 5.4 (FHIR batch 1 and Synthea)

Worktree `/home/claude/wt/5.4`, branch `wp/5.4`. Dependencies (own commit): `@medplum/core`, `@medplum/fhirtypes`, `@medplum/definitions` 5.2.18, exact. Routes: `GET /patients/:patientId/fhir/export` (`fhir.export`, `fhir.export_own`), `POST /fhir/import?onDuplicate=reject|skip` (`fhir.import`). Plain paths, not the FHIR Bulk Data `$export` operation. Measured results: `docs/evaluation/fhir-validation.md`. `pnpm synthea:demo` on 2026-11-20 regenerated byte-identical bundles and imported them (3 patients, 11 practitioners, 5 care plans, 32 observations created; 217 entries of other types skipped and listed; re-import 409). `scripts/gate-wp-5.4.sh` (API 4054, own database; `pnpm verify` inside) exit 0. It was run after the WP 5.1 gate finished: an earlier attempt overlapped that gate's `pnpm verify` and failed with `EADDRINUSE 127.0.0.1:4090` in the booking concurrency test, because both verify runs use port 4090. Tail:

```
==> evaluation (/tmp/fhir-eval.9ULC8o.json)
round trip Organization  records=1 pass layers 1-2=1 record equal=1 FHIR stable=1
round trip Practitioner  records=2 pass layers 1-2=2 record equal=2 FHIR stable=2
round trip Patient       records=1 pass layers 1-2=1 record equal=1 FHIR stable=1
round trip Goal          records=2 pass layers 1-2=2 record equal=2 FHIR stable=2
round trip CarePlan      records=2 pass layers 1-2=2 record equal=2 FHIR stable=2
round trip Observation   records=5 pass layers 1-2=5 record equal=5 FHIR stable=5
sample export bundle: entries=13 errors=0
broken fixtures: 31/31 fail with the expected rule; layer 1 (Medplum) flags 7
synthea practitioners.json  HTTP-equivalent 201 errors=0 created/skipped Patient 0/0 Practitioner 11/0 CarePlan 0/0 Observation 0/0
synthea patient-1.json      HTTP-equivalent 201 errors=0 created/skipped Patient 1/0 Practitioner 0/0 CarePlan 1/1 Observation 9/38
synthea patient-2.json      HTTP-equivalent 201 errors=0 created/skipped Patient 1/0 Practitioner 0/0 CarePlan 1/1 Observation 10/12
synthea patient-3.json      HTTP-equivalent 201 errors=0 created/skipped Patient 1/0 Practitioner 0/0 CarePlan 3/3 Observation 13/43
synthea re-import patient-1: 409 with 11 duplicates
 Test Files  4 passed (4)
      Tests  28 passed (28)
GET /patients/{patientId}/fhir/export is in openapi.json, so M8 enumerates it
openapi: valid OpenAPI 3.1.0, 64 operations, house rules pass
  25 skipped
  53 passed (5.1m)
verify: PASSED
WP 5.4 gate: PASSED
```

### D-WP-0 (land the design decisions, docs only)

Worktree `/home/claude/wt/d0`, branch `wp/d0` from main (which already contains the D1 merge `5823c4c`, so no `wp/design` rebase was needed). No code, no `packages/shared` and no `contracts/` change; `URGENT_NOTICE`, the pain anchor constants and the R5 label stay with D-WP-3.

- `docs/product/prd.md`: REQ-APT-03, AC-E5, AC-E10 and REQ-CHK-01 (pain anchors) edited; therapist navigation order set to Overview, Schedule, Patients, Review queue, Messages; new "Revisions (design checkpoint D1)" table dated 2026-11-20 with rejected change requests and open sign-offs S1 to S9 recorded as open with the shipped demo behaviour.
- `docs/decisions/contract-requests.md`: CR-6 to CR-17 filed as open, each with owner work package and blocking status. Blocking: CR-7 and CR-8 (WP 5.3), CR-13, CR-14 (availability), CR-15 (WP 6.2). All others non-blocking.
- `CLAUDE.md` "Design principles": cites DR-001 and `docs/design/design-tokens.md`; records no cream or warm surfaces, IBM Plex Sans only (Plex Mono for identifiers), and browser storage rule R1 with R2.
- Gate: `pnpm install --frozen-lockfile --offline` and `pnpm lint`; see the commit message for the result. `docs` is in `.prettierignore`; `CLAUDE.md` is not under `docs`.

### D-WP-3 (shared vocabulary and formatters)

Worktree `/home/claude/wt/d3`, branch `wp/d3`. Dependency commit first (own commit): `vitest` 4.1.12 added to `@carepath/shared`, a version already in the lockfile. No contract file, no `packages/ui` file and no `packages/db` file was touched.

- Label maps in `packages/shared/src/labels/` (exhaustive `Record<Enum, ...>`, tone and form per CD-230): enrollment and intake (`patientStatusLabels`, `intakeStatusLabels`, `ACTIVE_STATUS_DEFINITION`), care plan (`planStageLabels`, `planStageText`, `carePlanStatusLabels`, `versionMarkerLabels`, `versionText`), appointment (`appointmentStatusLabels` with staff and patient wording, `appointmentTypeLabels`), review (`reviewTaskStatusLabels`, `checkInReviewLabels`), priority (`priorityLevelLabels`, the two order lines), AI (`aiDraftStateLabels` for six derived states, `aiDraftState()`, `AI_GENERATED_NAME`, `AI_CONSENT_NAME`), clinical note (`clinicalNoteStatusLabels`, `noteVersionSourceLabels`), message delivery (`messageStatusLabels`, `messagesNotSentText`), session (`sessionStatusLabels`, `sessionActivityStatusLabels`), and the action label table (`actionLabels`, `actionLabelFor`, `GENERIC_ACTION_LABELS`, CD-428).
- `copy.ts`: `URGENT_NOTICE` (template with `{phone}`), `URGENT_NOTICE_NO_PHONE`, `urgentNoticeMessage()`, `PAIN_ANCHOR_LOW`, `PAIN_ANCHOR_HIGH`, `painChosenLine()`, `DEMO_DEFAULT_LABEL`. `EMERGENCY_NOTICE` unchanged.
- Formatters in `packages/shared/src/format/`: dates and times (clinic zone, `formatCalendarDay`, `formatVisitTime` for CD-314 with patient "Mountain Time" and staff "MT" naming and the viewer time for video visits, zone names that hold across daylight saving), durations and ages (prose and compact), numbers (`plural`, `formatCount`, `ofTotal`), dose and schedule text (CD-301, one formatter for both apps, `doseFieldLabels` for diffs), pain value text (CD-220).
- Tests (70 in `packages/shared`): the DB enums are read from `packages/db/prisma/schema.prisma` (no package dependency, so no workspace cycle) and the contract enums from `contracts/`; each map must cover its enum exactly, so a new value without a label fails. Banned-word and diagnostic-term checks run over every new string. `formatVisitTime` has daylight-saving (spring and autumn offsets), other-zone, no-daylight-saving-zone and next-day cases.
- `apps/web`: the clinician and patient `format.ts` and `scheduling.ts` files now re-export or wrap the shared functions under their old names; appointment, patient, intake, review task, session, plan version and message wording and the pain, dose, schedule and age text come from the shared maps. No layout change.

Gate: `pnpm verify` exit 0 on this branch (`packages/shared` 70, `packages/ui` 106, `packages/db` 71, `apps/api` 219 tests; end-to-end 53 passed, 25 skipped as before). Tail:

```
  25 skipped
  53 passed (6.3m)

==> docs/ unchanged by the run

verify: PASSED
db: lease 5717 released
```

Deviations and open points:
- Wording follows CD-231 to CD-240 as amended by DR-002 where `microcopy-guidelines.md` section 6 disagrees (that section predates the decisions): patient no-show is "You did not attend" (not "Missed"), video visits read "Video follow-up" in both apps, admin intake reads Not started, In progress, Submitted, Reviewed, unsent messages read "{n} of your messages were not sent" in both apps.
- One dose formatter replaces two that disagreed: sets with a timed duration now read "3 sets, 30 seconds each" in the clinician app too (was "3 sets of 30 seconds"); a sets-only dose now prints "3 sets" for patients (was empty). The exercise library suggestion uses it instead of "3 x 10" and "s".
- `isLocalDate` now rejects impossible days such as 2026-02-30 (the old check accepted them).
- Admin patients still shows registration as a UTC calendar date; the clinic-zone or date-only decision belongs to WP 6.2.
- Not applied to screens, because each changes a control or a component and belongs to the slice that rebuilds it: the CD-428 action labels (except the message retry button, now "Retry sending message" in both apps), Tag in place of chip for review task and plan version (CD-232, CD-234), the "Set by your care team" line shown to clinicians in `PlanView` (G10, which also serves the patient preview), `URGENT_NOTICE` in the composer (D-WP-12), the pain anchors (D-WP-10), and the AI consent wording (D-WP-8, open sign-off S6).
- The end-to-end retry test in `clinician-schedule-messages.spec.ts` was updated to the new button name but was among the skipped tests in this run, so it has not been exercised here.
### WP 5.4b (FHIR batch 2)

Worktree `/home/claude/wt/5.4b`, branch `wp/5.4b`. No schema change, no new dependency. Mappings and measured results: `docs/evaluation/fhir-validation.md`. `scripts/gate-wp-5.4b.sh` (API 4055, own database; extends the WP 5.4 gate with batch 2 round trips and fixtures, the seeded-database export check and `pnpm verify`) exit 0 on 2026-11-20. The first attempt was stopped while waiting on the shared web lock (deadlocked by the cluster inheriting the lock fd; fixed on main in 98bc0b6, cherry-picked here after the passing run). Tail:

```
==> evaluation
round trip Organization      records=1 pass layers 1-2=1 record equal=1 FHIR stable=1
round trip Practitioner      records=2 pass layers 1-2=2 record equal=2 FHIR stable=2
round trip Patient           records=1 pass layers 1-2=1 record equal=1 FHIR stable=1
round trip Goal              records=2 pass layers 1-2=2 record equal=2 FHIR stable=2
round trip CarePlan          records=2 pass layers 1-2=2 record equal=2 FHIR stable=2
round trip Observation       records=5 pass layers 1-2=5 record equal=5 FHIR stable=5
round trip Condition         records=3 pass layers 1-2=3 record equal=3 FHIR stable=3
round trip Appointment       records=6 pass layers 1-2=6 record equal=6 FHIR stable=6
round trip Encounter         records=2 pass layers 1-2=2 record equal=2 FHIR stable=2
round trip DocumentReference records=3 pass layers 1-2=3 record equal=3 FHIR stable=3
sample export bundle: entries=27 errors=0
broken fixtures: 55/55 fail with the expected rule; layer 1 (Medplum) flags 13
synthea practitioners.json  HTTP-equivalent 201 errors=0 created/skipped Patient 0/0 Practitioner 11/0 Encounter 0/0 Condition 0/0 CarePlan 0/0 Observation 0/0
synthea patient-1.json      HTTP-equivalent 201 errors=0 created/skipped Patient 1/0 Practitioner 0/0 Encounter 15/3 Condition 16/0 CarePlan 1/1 Observation 9/38
synthea patient-2.json      HTTP-equivalent 201 errors=0 created/skipped Patient 1/0 Practitioner 0/0 Encounter 15/1 Condition 17/0 CarePlan 1/1 Observation 10/12
synthea patient-3.json      HTTP-equivalent 201 errors=0 created/skipped Patient 1/0 Practitioner 0/0 Encounter 17/3 Condition 21/0 CarePlan 3/3 Observation 13/43
synthea re-import patient-1: 409 with 42 duplicates
patients exported: 40, bundles failing the three layers: 0
unsigned notes in the database: 3; draft version ids found in exports: 0
 Test Files  4 passed (4)
      Tests  31 passed (31)
  25 skipped
  53 passed (5.8m)
verify: PASSED
==> git status --porcelain
(clean)
WP 5.4b gate: PASSED
```

### D-WP-7 (illustrations)

Worktree `/home/claude/wt/d7`, branch `wp/d7`. Image work is in `docs/design/after/d-wp-7/` (contact sheet on `#FFFFFF`, `#F5F7FA` and `#EBEFF5`, and `pixel-check.json`).

- Part 1, recolour (no credits): all 19 accepted pictures re-exported at 960 and 480 as lossless WebP with true alpha, from the 1024 px previews (the Magnific CDN is blocked here; previews only). Exterior removed, lines ink `#172B4D`, former forest-green fills accent `#0E7490` (trousers) or ink (shoes, dark hair), tops accent-subtle, seq-2 or white, objects white with an ink outline, ground and mat lines `border-control`, skin tokens unchanged. Sources: 17 from `masters/`; `ex-knee-to-chest` from `rejected/ex-knee-to-chest-try2-79fadwtJAL.jpg` (the accepted try, which has no master); `moment-done-for-today` from `style-frames/frame3-moment-quiet.png` (no master either).
- Pixel check (design-tokens section 7) run on all 50 files on all three backgrounds: corners transparent, no flat warm non-skin, forest-green or cream pixel in any file. A strict "no light partially transparent pixel" test flags 5 pictures (7 files); each was looked at and is white fill meeting a thin gap at a mat or table edge, not a halo; one file has a single skin-and-ink blend pixel. Listed per file in the manifest `qa.pixelCheckNotes`.
- Part 2: six exercise pictures generated in the new palette wording on plain white (quad-set, heel-slide, straight-leg-raise, upper-trap-stretch, towel-reach-behind, walking-program), then mapped to the same recolour as Part 1. 6 accepted, 1 rejected (towel-reach-behind try 1: arm covered the face), 7 generations, 350 of 600 credits. Flagged for the reviewer: upper-trap-stretch shows a backless stool with the legs turned to one side; towel-reach-behind now shows a side view with the towel held low, not a reach over the shoulder.
- Wiring: `exercise-media.ts` has the six new entries with plain alt text; `illustration.tsx` picture container is now a `bg-surface-sunken` tile, `rounded-container`, no border; the caption "Illustration only. Follow the written steps from your care team." is unchanged. `asset-manifest.json` has 25 assets with prompts, seeds, bytes, dimensions and licensing "not verified". The seed text changed, so the seed hash changes.
- Not done: no vector trace (closed in WP 3.5); no medical review of the pictures (still "generated, not medically reviewed").

### WP 5.2 (AI summaries, SOAP drafts, review, notes; CR-7, CR-8, CR-16)

Worktree `/home/claude/wt/5.2`, branch `wp/5.2`, rebased onto `main` after WP 5.4, WP 5.4b and the design work packages merged; gate run at commit `9e2ebaf`. `scripts/gate-wp-5.2.sh` (API port 4052, own database, includes `pnpm verify`, ends with `git status --porcelain` empty) exit 0:

```
==> phase5_ai_review database tests       Tests  7 passed (7)
seed: integrity checks: 78 passed
content-hash: 9950d0b800436c823b2898868b39944de4dacca9036f3f2767eb2586e96a5425
seed check: 78/78 integrity checks passed
==> phase5/ai.test.ts (Scenario F)        Tests  21 passed (21)
==> phase3/m8-enumeration.test.ts         Tests  5 passed (5)
openapi: valid OpenAPI 3.1.0, 81 operations, house rules pass
pnpm verify: packages/ai 104, packages/fhir 101, packages/ui 106, packages/shared 70,
  apps/web 16, packages/db 78, apps/api 243 tests passed
  e2e: 53 passed, 25 skipped (5.1m)
==> docs/ unchanged by the run
verify: PASSED
(clean)
WP 5.2 gate: PASSED
```

- Module `apps/api/src/modules/ai` (repo, service, review-state, view, provider, routes) and `apps/api/src/modules/notes`; contracts `packages/shared/src/contracts/ai.ts` (generations, statements, evidence, review requests, encounters, clinical notes); `ClinicianOverview.aiDraftsAwaitingReview` in `overview.ts` (CR-16); new error codes in `errors.ts`.
- Routes (17): `GET /patients/:patientId/ai/generations`, `POST .../ai/summaries`, `POST .../ai/note-drafts`, `GET .../ai/generations/:generationId`, `GET .../ai/sources/:sourceType/:sourceId`, `POST .../ai/generations/:generationId/revisions`, `.../evidence-opens`, `.../approve`, `.../reject`, `.../regenerate`; `GET /patients/:patientId/encounters`, `GET .../notes`, `GET .../notes/:noteId`, `POST .../notes/:noteId/versions`, `.../sign`, `.../amendments`, `.../entered-in-error`. Permissions: reads `clinical.read`, generation `ai.generate`, review `ai.review`, notes `note.write`/`note.sign`; every write needs the care team; entered in error also takes a clinic administrator (`settings.manage`).
- Evidence (ADR-6): `createSqlResolver` loads cited records by type and id inside the organization through `loadSources` (check-in, session, activity, observation, sent message, appointment, plan version, encounter with `transcript.turn.<n>`) and applies `createInMemoryResolver` to them, so the scope and field rules are the reference behaviour itself. A test builds real inputs and checks every input record loads with exactly the fields the prompt was built from. Statements are verified again on every read and before approval; a reference to another patient's record is `out_of_scope`, its value is never returned, and the sources route answers 404 with `security.access_denied`.
- Storage: one `AIGeneration` row per request, written complete in one transaction with its `ai.generate` event (provider, label, model, prompt key and version, tokens, cost, latency, unsupported count). `input` JSON holds the request, input references and the run record (per-attempt calls, cost label, redaction counts, error code); `output` holds the validated draft and the verification at generation; failed rows have no output. Clinician work is append-only `AIReview` rows: `revised` rows carry the whole review state (statement resolutions, acknowledged missing items, evidence opens), then at most one decision. Approving a note draft creates a `ClinicalNote` in `draft` authored by the approving therapist with one `ai_draft` version; only `POST .../sign` by the author signs.
- Decision: generation runs inline, not as a job. The demo provider answers in milliseconds; a job would add a pending state and polling for no gain. Worst case with an external provider is three attempts of `AI_TIMEOUT_MS` (20 s) plus 1.5 s backoff. A failed generation is stored as `failed` and answered 502 `ai_generation_failed` with a `Location` header and the id in `error.details[0].issue`; it is never answered as success.
- Approval gate (design CD-407 option A, DR-002 M), demo rules pending clinical governance review: every unsupported statement edited, removed or acknowledged with a note; every missing-information item acknowledged; for progress summaries, evidence opened for each reported-change statement still in the output; something left to approve; active AI consent (CR-7, 409 `ai_consent_withdrawn` with `ai.refused`). Reject is always available while undecided. Revisions and approval carry the revision id the clinician read; another clinician's newer revision answers 409 `revision_stale`, so clinician text is never overwritten.
- Notes (CR-8), demo rules pending clinical governance review: amendments are created and signed in one call by the author with a reason; signing refuses a note whose four sections are all blank (409 `note_empty`); a signed note can be marked entered in error by its author or a clinic administrator with a reason, irreversibly (database trigger), and stays readable.
- Consent: generation without active `ai_assisted_features` consent answers 409 `ai_consent_required`, writes `ai.refused` (detail `consent_required`) and stores nothing. The per-user limit (10 generations a minute, `AI_GENERATIONS_PER_MINUTE`) answers 429 with Retry-After and `ai.refused` (detail `rate_limited`); every AI and note write route also has a route limit (`AI_ROUTES_PER_MINUTE`, 60).
- Providers: deterministic by default, labelled "Demo provider, rule-based". `AI_PROVIDER=anthropic` with `CAREPATH_ANTHROPIC_API_KEY` and `CAREPATH_ANTHROPIC_MODEL` selects the Anthropic provider; it has not been run against the live API. Test hook `AI_PROBE` (ignored in production): `fail` (every attempt returns invalid output) or `unsupported` (adds one statement with no source); probe output is labelled "(test probe: ...)" in its stored provider label.
- Migration `20261124050200_phase5_ai_review` (schema change after C1, for C3 review): `AIReviewDecision` gains `revised`; `AIGeneration.previousGenerationId` (same patient, never itself); partial unique index of one decision per generation and a trigger refusing any review after the decision or of a failed generation; completed generations cannot be updated or deleted; `ClinicalNote.enteredInErrorAt/Reason/ByUserId` with a check and a freeze trigger. Tests: `packages/db/test/phase5-ai-review.test.ts`.
- Audit events: `ai.generate` (success or minor_failure with the error code), `ai.refused`, `ai.review` (details `revised`, `evidence_opened`, `approved`, `approved_with_edits`, `rejected`), `note.sign` (detail `amendment` for amendments), and two names outside the PRD list: `note.version` (working version of a draft) and `note.entered_in_error`. Reads of generations, sources, encounters and notes write `phi.read`.
- Seed: generations are the deterministic provider's real output on the seeded records (`packages/db/seed/ai.ts`, `packages/db` now depends on the workspace `@carepath/ai`), stored in the API format; therapist.demo has an unreviewed summary of patient.demo on the overview and patient.demo has a visit two days before the anchor with a synthetic transcript and no note. One failed attempt is recorded as the `AI_PROBE=fail` hook produces it, followed by its regeneration. The earlier hand-written "timeout" failure is gone. Seed transcripts gained a range-of-movement line matching the visit observation. Integrity checks: 78; content hash `9950d0b800436c823b2898868b39944de4dacca9036f3f2767eb2586e96a5425`.
- Deviations: (1) Schema change after C1 (above). (2) `note.version` and `note.entered_in_error` audit names are not in PRD section 13. (3) Evidence opens are recorded by a POST, not by reading the source record, so a read stays a read. (4) Encounter `bodyRegion` is null (no column). (5) Clinic administrators reach the entered-in-error route through `settings.manage`, the administrator-only permission; no new permission key. (6) Only the DocumentReference mapper (WP 5.4 batch 2) can exclude entered-in-error and draft notes from export: export only `status = signed`.
- For WP 5.3: every review write returns the full `AiGeneration`; send its `currentRevisionId` as the next `baseRevisionId`/`revisionId` (evidence opens move it too). Show `approval.blockers` as the reason the decision is unavailable. Labels come from the UI's own vocabulary: `status`, `reviewState`, `statements[].support`, `resolution`, `unsupportedReason`, `sourceRefs[].status`; `provider.label` is shown as received and `provider.isDemo` marks demo output. Use `GET .../ai/sources/encounter/:id` for the side-by-side transcript (`transcript` turns, `syntheticTranscript: true`). `AI_PROBE=fail` and `AI_PROBE=unsupported` give the failure and unsupported states in Playwright.
- Other shared files touched: `packages/shared/src/labels/ai.ts` maps the new `revised` review kind to the existing "unreviewed" draft state (a revision is not a decision; CD-236's six states are unchanged); `packages/db/test/seed.test.ts` encounter counts include the Scenario F visit; `apps/api/src/app.ts` (two registrations, `aiProvider` option), `config.ts` (AI settings), `core/audit/audit.ts` (two event names), `modules/overview/routes.ts` (one list).
- For WP 5.4b: amendments keep the signing model (the header's `signedAt` and signer never change; an amendment is a signed version created by the author), and entered-in-error notes keep `signedAt`. DR-002 M says an entered-in-error note is excluded from export; the batch 2 mapper currently exports its versions with status `entered_in_error`, which is that work package's call.
### D-WP-1 (tokens, type and capture tooling)

Worktree `/home/claude/wt/d1`, branch `wp/d1`, rebased on main after D-WP-0, D-WP-3, WP 5.4b, D-WP-7 and the web-lock and ephemeral-port fixes. Dependency commit (own commit): `@fontsource/source-serif-4` removed from `@carepath/ui`.

- `packages/ui/src/tokens/tokens.ts`: the DR-001 values from `docs/design/tokens-final.json`, one palette for `patient` and `clinician` (`ColourTokens` gains the `meta.extraKeys`), density per `design-tokens.md` section 5 plus `textExtra` (data value, notes, page, section and component titles, overline), `fonts.serif` kept as the sans stack so old references resolve, `scrim` and `elevation.overlay` on `rgb(23 43 77)`. `tokens.css` regenerated; `preset.css` exposes every new colour and text role as a Tailwind utility (`bg-ai-bg`, `text-link`, `bg-selected-bg`, `text-data-value`, and so on).
- `contrastPairs` follows DR-001 section 8: `link` replaces `primary` as text, `selected-ink` on `selected-bg` replaces the old tint pair, and the pairs of `design-tokens.md` sections 6.1 and 6.2 are added (93 pairs per theme, all pass).
- `contrast.test.ts`: DR-001 values; the two colour maps are equal; `tokens.ts` equals `tokens-final.json` (colours, density, `textExtra`, fonts, overlay); scales `[15,17,20,24,32,40]` and `[12,13,14,15,18,24]` with every role on its scale; Plex Sans headings in both themes and no "Serif" in any token or the generated CSS; `fonts.ts` loads exactly the five DR-001 faces; "status tokens are not brand blue"; `ai-*` saturation 0.35 or less; "contains no warm neutral"; scrim and shadow derived from `ink`. "limits blue to focus and info" and "uses serif headings for patients only" are deleted.
- Components: only `AIDraftBlock` changed (`bg-ai-bg`, DR-001 section 8); no component depended on a removed token. The gallery's colour and type copy no longer mentions forest or Source Serif and shows the new roles; `design-system-screenshots.mjs` checks Plex Sans 600 instead of the serif. `docs/design-system/README.md` has the new palette and font text; `components.md` colour words updated. The favicon uses `accent` (the brand-mark token).
- Capture tooling: `apps/web/scripts/design-capture.mjs` (with `scripts/design-capture.sh` for database, build and servers) captures the 40 baseline screens at 375, 390, 768, 1024, 1440 and 1920 with the baseline file names and writes `_probe.json` (overflow, computed backgrounds, warm backgrounds with status and chart tokens listed apart, targets under 24 px and under the theme floor with the first offenders named, axe serious or critical at 375, 768 and 1440). `SCREENS`, `WIDTHS` and `PROBE_FAIL_ON` serve later packages. All six widths of a screen show the same state (the viewport is resized), so the session and discomfort chain runs once on `patient.flare` instead of rotating personas.
- `docs/design/after/d-wp-1/`: 240 images and `_probe.json` from the gate's own capture run on this branch (same seed anchor and fixed clock as the baseline). Probe: no warm background on any screen; 18 images carry `warning-bg` (chips and banners, a status token, hue 53); horizontal overflow on the same 15 images as the baseline (admin patients, clinician schedule and record appointments at 375, 390, 768: layout work for D-WP-6, D-WP-14, D-WP-15); one axe serious finding, `target-size` on `patient-reschedule-375` (4 nodes), seen now because axe runs at 375 (the baseline ran it at 1440 only), left for D-WP-11 and D-WP-2.

Gate: `scripts/gate-wp-d1.sh` exit 0 (token tests, `contrast.mjs --strict`, typecheck, lint and format of owned paths, capture with `PROBE_FAIL_ON=warm`, `pnpm verify`, clean tree). Tail:

```
==> contrast.mjs --strict on tokens-final.json
### theme: patient  (84 pairs, 0 below threshold, 0 missing)
### theme: clinician  (84 pairs, 0 below threshold, 0 missing)
contrast.mjs --strict: exit 0
design-capture: 240 images in /home/claude/wt/d1/.data/capture-d-wp-1
  warm backgrounds (not a status or chart token): 0 images
  warm status or chart token backgrounds (allowed): 18 images
  horizontal overflow: 15 images
  axe serious or critical (at 375, 768, 1440): 1 images
  interactive targets under 24 px: 219 images
  interactive targets under the theme floor: 225 images
packages/ui test:       Tests  227 passed (227)
apps/api test:       Tests  222 passed (222)
  25 skipped
  53 passed (5.3m)
==> docs/ unchanged by the run
verify: PASSED
==> git status --porcelain
(clean)
D-WP-1 gate: PASSED
```

Deviations and open points:
- Output folder is `docs/design/after/d-wp-1/` (lower case, as the orchestrator asked); the rebuild plan row says `D-WP-1`.
- The probe's warm rule (hue 25 to 65, saturation above 0.10) also matches `warning-bg` `#FEF7C3`, which DR-001 kept on purpose. The probe therefore reports status, chart and accent token colours separately and fails only on other warm colours. The probe reads computed CSS backgrounds only, not pixels inside images.
- `apps/web/components/illustration.tsx` was not touched (D-WP-7 owns it and has already changed it). `apps/web/app/icon.svg` and `docs/design-system/components.md` were outside the listed paths and were edited for the colour change only.
- Interaction-state rules in `design-tokens.md` section 3 (hover `primary-subtle`, selected edge bar, outline secondary button) are not applied to components; that is D-WP-2. Heading `h4` weight 500 for patients is not applied either (the `Heading` component uses one weight).
- The baseline capture script was not in the repository, so this one was written from the audit's description; its file names match the baseline, its states are close but not identical (one persona for the session chain, `/review-queue` without a task selected at 1440).

### WP 5.6a (checkpoint C3 fixes A1 to A5 in packages/ai)

Worktree `/home/claude/wt/5.6a`, branch `wp/5.6a`, from main at `dc80bf3`. Owned paths only: `packages/ai/**`, `docs/evaluation/ai-eval.md`, `docs/evaluation/ai-eval.json`, this section.

- A1: `ProgressSummaryOutput.summary` may be empty. `progress_summary@1.1.0` is registered with a change note and its fingerprint pinned (`e7f86b44…dcb2a`). Version 1.0.0 renders its contract from `ProgressSummaryOutputV1_0`, the schema it was written against, so its pinned fingerprint is unchanged; a test checks that 1.0.0's contract still requires one summary statement and 1.1.0's does not. Pipeline tests: an empty window and a window with one patient message both succeed in one attempt with no summary statements and the expected `missingInformation` (five and four items).
- A2: `verifyOutput` takes an optional `{ allowedRecords }` (type and id). A ref that resolves but names a record outside the list makes its statement unsupported with reason `not_in_input`; each ref then carries `inInput`. An unresolved ref is still reported as `unresolved_source_ref`. The pipeline passes the generation's own `inputRefs`, so `unsupportedStatementCount` stored at generation now counts `not_in_input`. Called without the option (the API read path and the approval transaction today), behaviour and the return type are unchanged; B8 in WP 5.6b passes stored `inputRefs` and adds the reason to the shared contract. Tests: verifier unit test, and a pipeline test with a provider citing an in-scope check-in it was not given.
- A3: after `restore`, any `[[KIND_n]]` token left in an external provider's output is `invalid_output` ("Output contains n redaction token(s) that match no redacted value."). Tests: an invented `[[NAME_9]]` fails all three attempts with no output; a token the redactor issued is restored and accepted.
- A4: the Anthropic provider reads `stop_reason`; `max_tokens` is `invalid_output` with a message naming truncation and the output limit, `retryable: false`. Usage reported on a failed reply (truncated, or not JSON) now travels on the error (`AIError.attemptUsage`) and is counted in that attempt's record and the totals. Tests with the injected `fetch`: one call, tokens and cost recorded; a non-JSON reply is still retried three times with tokens summed.
- A5: the report renders three statements beside the table: the unsupported-statement rate and citation accuracy are true by construction for the demo provider; the injection results are in-sample (patterns written after reading case-06 and case-19, two of the four probes; n = 4); the report covers note drafts only and progress summaries have no evaluation. `pnpm ai:eval` re-run at `87d71dd` and committed.
- C3 1.1 item 5 (short name parts as names) is recorded as a limitation in the header of `packages/ai/test/redaction.test.ts`.

Measured results of the re-run (`docs/evaluation/ai-eval.md`, demo provider, 25 cases): structured-output validity 25 of 25; first-attempt validity 25 of 25; unsupported statements 0 of 181; expected-fact recall 146 of 195; recall in any section 155 of 195; citation accuracy of recalled facts 146 of 146; missing-information precision 55 of 75, recall 55 of 58, exact match 9 of 25; injection probes kept in schema 4 of 4, followed 0 of 4, notice raised 4 of 4. Identical to the WP 5.1 run; the allow-list changed nothing because the demo provider cites only its input.

Gate: `scripts/gate-wp-5.1.sh` exit 0 (including `pnpm verify`). Tail:

```
==> all packages/ai tests
 Test Files  9 passed (9)
      Tests  114 passed (114)
==> eval cases match EvalCase v1
==> eval smoke run (scratch output)
==> pnpm verify
==> seed (small profile)
integrity checks: 78 passed
content-hash: 26a0d46314c2ff22a9a969d8e6d09647b3f9d5ea8e57969e5d97083f2ea9c5e9
packages/ai test:       Tests  114 passed (114)
packages/fhir test:       Tests  101 passed (101)
packages/shared test:       Tests  70 passed (70)
packages/ui test:       Tests  227 passed (227)
packages/db test:       Tests  78 passed (78)
apps/api test:       Tests  243 passed (243)
  25 skipped
  53 passed (4.9m)
==> docs/ unchanged by the run
verify: PASSED
db: lease 5387 released
==> git status clean
WP 5.1 gate: PASSED
EXIT=0
```

Deviations and notes:
- Seed: no file in `packages/db` was changed. The seed stores `getPrompt(kind).version`, so seeded progress summaries now carry `progress_summary@1.1.0` and the content hash moved from `9950d0b8…a5425` to `26a0d463…c5e9`. No seed test pins the hash; 78 of 78 integrity checks pass.
- The C3 note names API port 4051 for this gate; `scripts/gate-wp-5.1.sh` starts no API of its own, and its `pnpm verify` stage uses 4090 and 3090 as `scripts/verify.sh` sets them.
- `AIError` gained `attemptUsage` (not in the item list) so that a truncated reply, which is not retried, still has its tokens and cost recorded, as C3 1.1 requires of failed attempts.
- The WP 5.1 lines in this file that C3 3.2 and 3.3 name (deviation 2 on the empty summary, "two rules were adjusted") are left for the orchestrator, as C3 section 6 assigns.


### WP B-CR (contract batch: CR-6, CR-9, CR-10, CR-11, CR-12, CR-17)

Worktree `/home/claude/wt/bcr`, branch `wp/bcr`, rebased onto `main` after D-WP-1, the C3 documents and WP 5.6a. `scripts/gate-wp-bcr.sh` (API 4034, web 3034, own database, includes `pnpm verify`) exit 0:

```
==> bcr_contract_batch database tests    Tests  6 passed (6)
seed: integrity checks: 78 passed
content-hash: 230b13e29af6443b636fb230b6f87d5a8c72b80f5131547626fa0602e65d3b38
seed check: 78/78 integrity checks passed
==> shared tests                          Tests  72 passed (72)
==> bcr/contract-batch.test.ts            Tests  20 passed (20)
==> m8-enumeration.test.ts                Tests  5 passed (5)
openapi: valid OpenAPI 3.1.0, 82 operations, house rules pass
==> Playwright bcr-search-privacy         2 passed (clinician directory, admin patients)
pnpm verify: packages/fhir 101, packages/ai 114, packages/ui 227, packages/shared 72,
  packages/db 84, apps/api 263 tests passed; e2e: 57 passed
WP B-CR gate: PASSED
(clean)
```

- Schema (one migration, `20261125000000_bcr_contract_batch`): `ReviewTaskEvent` (append-only by trigger, `seq` keeps order within one instant, checks on practitioner and note), `IdempotencyKey` (unique per organization, user, scope and key, with checks), `ReviewTask` unique on `(id, organizationId)`. `openapi.json` regenerated once (82 operations).
- CR-6: stop with no rating stores no number and writes no observation; the rating follows as a check-in. CR-9: `priorityLevel` is high at stored priority 70 or more (`HIGH_PRIORITY_MIN`). CR-10: `ruleTotals` on both task lists. CR-11: new table rather than the audit log (audit has no notes, did not record assign, and has no key to the task); events on every task response. CR-12: `POST /patients/search`; `q` removed from `GET /patients`; clinician directory and admin patients keep the term in component state. CR-17: `Idempotency-Key` on book and reschedule, 24 hour window, advisory lock on the key, concurrency tests. Details are in `docs/decisions/contract-requests.md`.
- Deviations: (1) Idempotency also covers reschedule. (2) The seed now writes assigned and closed events for seeded tasks, and the content checksum leaves out `ReviewTaskEvent.seq`. (3) `GET /patients` ignores an unknown `q` instead of answering 400. (4) Search state is component-local, not the layout-level store of DR-002 I (D-WP-13). (5) Existing tests and the `slice` and empty-queue e2e specs were updated for the new contracts (`ruleTotals`, search by POST). (6) A second concurrent run of the gate was started by mistake and stopped; the passing run is the single one.
- Not done: `packages/ui` untouched; the review queue UI does not yet show the tag, chips or history (later UI packages).

### WP 5.6b (checkpoint C3 fixes B1 to B8)

Worktree `/home/claude/wt/5.6b`, branch `wp/5.6b`, from `main` at `e5db911` (after WP 5.6a and WP B-CR). `scripts/gate-wp-5.6b.sh` (API 4056, own database, includes `pnpm verify`) exit 0:

```
==> migrate, migrate:check                       (migration 20261126000000_phase5_c3_fixes)
==> phase5-c3-fixes + phase5-ai-review db tests  Tests  22 passed (22)
seed: integrity checks: 79 passed
content-hash: 230b13e29af6443b636fb230b6f87d5a8c72b80f5131547626fa0602e65d3b38
seed check: 79/79 integrity checks passed
==> c3-fixes, ai, fhir, authz API tests          Tests  54 passed (54)
==> m8-enumeration.test.ts                       Tests  5 passed (5)
==> shared tests                                 Tests  74 passed (74)
==> fhir tests                                   Tests  101 passed (101)
patients exported: 40, bundles failing the three layers: 0
  DocumentReference 6; unsigned notes in the database: 3; draft version ids found in exports: 0
openapi: valid OpenAPI 3.1.0, 82 operations, house rules pass
pnpm verify: packages/ai 114, packages/fhir 101, packages/shared 74, packages/ui 227,
  packages/db 99, apps/api 271 tests passed; e2e: 57 passed (4.9m); docs/ unchanged by the run
verify: PASSED
(clean)
WP 5.6b gate: PASSED
```

`GATE_SKIP_VERIFY=1 FHIR_EVAL_OUT=docs/evaluation/fhir-validation.json scripts/gate-wp-5.4b.sh` on the same branch, exit 0: round trip 10 of 10 types equal and stable (DocumentReference records=3), sample export 27 entries 0 errors, broken fixtures 55 of 55 fail with the expected rule (layer 1 flags 13), Synthea files 0 errors and re-import 409 with 42 duplicates, seeded export 40 of 40 pass (9 Encounter, 6 DocumentReference); `fhir-validation.json` unchanged by the run.

- B1 (CR-18): `note.mark_entered_in_error` in the shared vocabulary and the API role matrix, granted to `clinic_admin` by migration. The route admits `note.sign` or `note.mark_entered_in_error`; the handler allows the author or a holder of the permission; no role name is compared in `modules/notes`. Without `clinical.read` the answer is the header with `versions: []`, `currentVersion: null`. Audit: author `treatment`/`author`, permission `operations`/`mark_entered_in_error_permission`.
- B2: `loadPatientExport` reads notes with `status = signed`; `signedNoteDocuments` returns nothing unless the status is `signed`. The fixture set swaps the exported entered-in-error note for a signed initial evaluation, so 34117-2 is still covered and the counts in `fhir-validation.md` do not change. API test: sign, amend, mark, export, no id of the note or its versions.
- B3: summaries of entered-in-error, sign, list notes, export, get generation and approve; `openapi.json` regenerated.
- B4 (CR-19): index `ClinicalNote_one_signed_per_encounter_key`; `POST …/sign` answers 409 `encounter_already_documented` (pre-check under the note lock, and the index violation mapped to the same code); entered in error frees the visit; seed integrity check (content hash unchanged).
- B5: `patientIdentifiers` adds every care-team member's names (display name and practitioner names), the senders of the messages in the input and, for a note draft, the visit's practitioner. Only an external provider uses them.
- B6: `packages/db/test/phase5-c3-fixes.test.ts`, 15 tests: each branch of `ClinicalNote_entered_in_error_check` (insert and update), the freeze trigger (field change, new version, current version), the grant, and the index.
- B7: "Draft, generated, not reviewed", "Generated, reviewed and approved", "Generated, edited and approved", "Started from a generated draft", `AI_GENERATED_NAME` "Generated draft"; `DEMO_PROVIDER_NOTICE` "Rule-based demo output. No AI model was used." in `packages/shared/src/copy.ts`, in the banned-word set and with a test that no generated-output label says AI.
- B8: `verifyStored` passes the row's `inputRefs` as `allowedRecords` on read and inside the approval transaction; a row without `inputRefs` verifies as before. Contract: `unsupportedReason` gains `not_in_input`; `AiSourceRef.inInput` (boolean, null for older rows and notices).
- Deviations: (1) `apps/api/src/core/authz/permissions.ts` and `packages/db/seed/integrity.ts` are outside the listed ownership; the role matrix must match the migration (tested) and B4 asks for the seed check. (2) The test fixture `createGenerationAndNote` now stores the record it cites in `inputRefs`; with an empty list its statement would read `not_in_input`. (3) A draft note on a visit that already has a signed note can still be created and edited; only signing is refused. (4) The FHIR record type keeps its `entered_in_error` status value and the mapper still writes `entered-in-error` for such a record, though the export no longer produces one.

