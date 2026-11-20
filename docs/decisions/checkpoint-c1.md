# Checkpoint C1: schema, isolation and auth review

Date: 2026-11-19. Reviewer: advisor. Scope: WP 2.1 to 2.6 and the PRD, before any Phase 3 feature work. Where this note differs from `advisor-plan.md`, `advisor-plan-rev1.md` or `docs/product/prd.md`, this note wins.

**Decision: go for Phase 3, conditional on WP 3.0 (section 5.3) landing first.** No work package is rejected. Five are accepted with fixes, one as is, and the PRD with amendments.

## 0. What was checked

- `pnpm verify` run by the reviewer from a stopped cluster: exit 0. packages/ui 106 tests, packages/db 40, apps/api 61; migrate, seed (content hash `dbe27991…52cd`, same as PROGRESS), typecheck, lint, build passed. Playwright and axe stage SKIPPED, as designed.
- Read in full: `scripts/db.sh`, `scripts/verify.sh`, both gate scripts, the constraints migration, `schema.prisma`, all of `apps/api/src/core` and `modules/patients`, `apps/api/test/core/isolation.test.ts`, the ESLint config, PRD sections 4 to 10, 13, 16 to 19.
- Probed the database directly in a scratch database (seeded small profile, every statement rolled back). Results are in section 1, WP 2.3.
- Spot-checked only: `packages/ui` (two screenshots, grep for guardrail violations), `packages/db/seed` (writer, CLI, test harness), `schema-engine.ts` (database selection and shadow database only). Not reviewed line by line.
- Not checked: Docker Compose, CI (never run), behaviour of two gates running at once (reasoned from the scripts, not reproduced).

## 1. Verdict per work package

| WP | Verdict |
|---|---|
| 2.1 Monorepo, tooling, db.sh, verify | Accept with fixes |
| 2.2 Tooling probe | Accept |
| 2.3 Schema and constraints | Accept with fixes |
| 2.4 API core | Accept with fixes |
| 2.5 Tokens and UI primitives | Accept with fixes |
| 2.6 Seed | Accept with fixes |
| PRD | Accept with amendments (section 3.7) |

### WP 2.1: accept with fixes

- `scripts/verify.sh:9-12`: the exit trap always runs `db.sh stop`, so a verify run kills the cluster under every other worker.
- `scripts/verify.sh:25-27`: migrates and seeds the shared `carepath` database. The seed truncates every tenant table (`packages/db/seed/write.ts:18`), which wipes fixtures other gates are using.
- `scripts/db.sh:16`: database name is hard-coded. `:62-69` stop has no notion of who else is using the cluster. `:71-75` reset deletes the data directory unconditionally.
- `.github/workflows/ci.yml:31-36`: no seed step. The comment says WP 2.6 adds it; it did not. `verify.sh` and CI now run different stages.
- Fix for the first three is section 4. Add `pnpm db:seed --profile small` to CI after migrate.

### WP 2.2: accept

Failures are recorded as failures (Playwright CDN blocked, HL7 packages blocked). System Chrome 153 against Playwright 1.65.1 is an unverified version pairing; keep saying so. `docs/PROGRESS.md:15` still lists WP 2.2 as outstanding; correct it.

### WP 2.3: accept with fixes

What holds, confirmed by probe: cross-organization references are rejected, illegal status updates raise CP001, append-only tables reject UPDATE and DELETE, CHECK constraints catch a `completed` session with no `completedAt` even on INSERT.

Defects:

1. **No same-patient integrity inside an organization.** Composite foreign keys carry `organizationId` only. All seven probes were accepted by the database:
   - `ExerciseSession` for patient A against patient B's `CarePlanVersion` (`schema.prisma:810`)
   - `PatientCheckIn` for A pointing at B's session (`:857`)
   - `Observation` for A pointing at B's check-in or session (`:894`)
   - `Goal` for A on B's care plan (`:653` model)
   - `SessionActivity` whose assignment belongs to a different plan version than its session (`:837`)
   - `ClinicalNote` for A on B's encounter (`:1007` model)
   - `Appointment` whose slot belongs to another practitioner and another time (`:929` model)

   A service bug here links one patient's data into another's record. Fix in WP 3.0 for the first six (section 5.3, M2). The appointment and slot case goes to WP 4.1 and is reviewed at C2.
2. **PRD requirements with no column.** `SessionActivity` has no skip reason (AC-C3). `ExerciseSessionStatus` (`:143`) has no stopped-for-discomfort state (AC-C4). No eligibility code storage exists anywhere (AC-A3). `Organization` (`:315`) has no clinic phone or reply-time text (AC-D7, REQ-ADM-05). All four block Phase 3 scenarios. Fix in M2.
3. **Audit immutability is narrower than the wording suggests.** `migration.sql:195` blocks UPDATE and DELETE. `TRUNCATE "AuditEvent"` succeeds, and the application role is a superuser (`scripts/db.sh:53`), so it can disable the trigger. Both confirmed. No code change now. Every document must say "UPDATE and DELETE are rejected by trigger; this guards against application bugs, not against a database administrator". WP 8.2 records it in the threat model.
4. `AuditActorType` (`:274`) has no value for an unauthenticated caller. See ruling 3.1.

### WP 2.4: accept with fixes

Sound: deny-by-default access hook, session hashing and rotation, idle and absolute expiry, Origin plus CSRF token, byte-identical 404, PHI-safe logging with a canary test, job claim with SKIP LOCKED guarded by `lockedBy`.

Defects:

1. **Audit writes are not atomic with the change they describe.** `apps/api/src/core/audit/repo.ts:5` and `audit.ts:79` always use the root client. Once real writes exist, a failed audit insert returns 500 after the change has committed. Fix in M4.
2. **Database errors are not mapped.** `apps/api/src/core/errors.ts:121-148` has no branch for 23P01, 23505, CP001 or CP003, so a booking overlap, a duplicate or an illegal transition answers 500. `packages/db/src/errors.ts` already classifies them. Fix in M5.
3. **Scoping is a convention, not a structure.** `Db` is the raw Prisma client (`core/db/repo.ts:7`); nothing stops a new `repo.ts` from omitting `organizationId`. `patientScopeWhere` covers only lookups keyed by patient id. Phase 3 adds lookups by care plan, session, task and check-in id. Fix: M8, the enumeration test, is a hard gate for WP 3.1.
4. `apps/api/src/core/audit/audit.ts:94`: anonymous callers recorded as `system`. See ruling 3.1.
5. `apps/api/package.json:7-8`: `start` needs `tsx`, which is a devDependency, and `build` emits a `dist` that cannot run. See ruling 3.6.
6. `apps/api/src/app.ts:51` and `core/http.ts:33`: `trustProxy` is off and the global limit keys on `request.ip`. Behind the same-origin proxy ruled in section 5.2 every browser shares one address. Fix in M3.
7. Job handlers receive the raw client and an `organizationId`. From WP 3.1 on, every handler builds a system context from `job.organizationId` and uses scoped repositories. No handler queries across organizations.
8. Contracts live in `apps/api` (`core/auth/contracts.ts`, `core/errors.ts`, `modules/patients/routes.ts:7-27`). See ruling 3.5.

### WP 2.5: accept with fixes

Screenshots match plan section 4: two themes, no gradients or purple, radio pain scale, dense clinician table. Defects:

- The ESLint rule banning raw hex and arbitrary Tailwind values in `apps/web` (plan risk 8) was not added. It must exist before any Phase 3 screen is written. Assigned to WP 3.2a.
- `apps/web/app/(public)/design-system/demos.tsx:316` and `page.tsx:546` use the chip label "On track". That is a judgement the product does not make. Replace with a factual label ("No open items"). Phase 3 screens must not use "On track", "improving" or similar.
- No axe run yet. It arrives with the Playwright stage in WP 3.2a.

### WP 2.6: accept with fixes

Determinism and integrity checks hold. Defects:

- The seed must be regenerated after M2 (eligibility codes, clinic phone, skip reasons, one session stopped for discomfort) and after the contracts land (`IntakeAssessment.answers`, `ReviewRule.params`, `CarePlan.draftContent` are provisional shapes today). The recorded content hash changes; record the new one.
- The fixed anchor (2026-11-19T16:00Z) means "due today" data goes stale as real time passes. See ruling 3.8.

## 2. Dependency approvals

All approved at the exact pins now in the lockfile. No rejections.

| Package | Decision | Note |
|---|---|---|
| `tailwindcss` 4.3.5, `@tailwindcss/postcss` 4.3.5, `postcss` 8.5.33 | Approve | Tokens only; lint rule from WP 3.2a enforces it |
| `@radix-ui/react-*` (13 packages in `packages/ui`) | Approve | Accessibility primitives. A new Radix package still needs a request |
| `@fontsource/ibm-plex-sans`, `ibm-plex-mono`, `source-serif-4` | Approve | Self-hosted, plan section 4 |
| `@playwright/test` 1.65.1 | Approve | Runs on system Chrome through `PLAYWRIGHT_CHROME_PATH` |
| `@prisma/adapter-pg` 7.10.1, `pg` 8.23.1 | Approve | Required by Prisma 7 |
| `@prisma/schema-engine-wasm`, `@prisma/driver-adapter-utils` | Approve, dev only | Must stay on the engine commit of the pinned `prisma`. Upgrade all Prisma packages together or not at all. Docs keep saying `prisma migrate` itself is unverified here |
| `tsx` 4.23.15 | Approve | Moves to `dependencies` in `apps/api` (ruling 3.6) |
| `zod` 4.6.7 | Approve | Also added to `packages/shared` at the same pin |
| `fastify-type-provider-zod` 7.0.0, `@fastify/swagger` 9.9.5, `@fastify/rate-limit` 11.2.2, `openapi-types` 12.1.3 | Approve | Named or implied by ADR-2 and ADR-4 |
| `@fastify/cookie` 11.1.5 | Approve | Preferable to hand-rolled cookie parsing |
| `@fastify/cors` 11.4.3 | Approve | Kept for direct API access by tools. Browsers use the same-origin proxy (5.2) |
| `@apidevtools/swagger-parser` 13.1.0 | Approve, dev only | |

Pre-approved for Phase 3, exact pins, added in one `deps:` commit each: `@tanstack/react-query` (ADR-12) and `@axe-core/playwright` (plan gate) in `apps/web`. Not approved without a request: form libraries, chart libraries (charts are hand-written SVG with a table), date libraries (use `Intl`), mock-server libraries.

## 3. Rulings

### 3.1 Anonymous actor for failed logins

Add `anonymous` to `AuditActorType`. `system` is reserved for jobs and automated rules; an unknown person at the login form is not the system. Add a check that `anonymous` rows have no `actorUserId`. Drop `metadata.anonymous`.

### 3.2 403 or 404 for clinicians off the care team

Upheld as built. Clinical write by a same-organization clinician off the care team: 403 `not_on_care_team` plus an audit event. Reads are allowed to that clinician, so a 404 would be false. Anything outside the organization, and a patient asking for another patient, stays 404 with a byte-identical body. This amends ADR-8, which said every cross-scope lookup is 404.

### 3.3 Exclusion constraint scope

Upheld as built: every non-cancelled status. This amends ADR-9. With `booked` only, a checked-in or completed visit would stop blocking its time and the same hour could be booked again. `requested` exists in the enum but no workflow creates it; the API must not create `requested` appointments unless a later checkpoint adds that flow.

### 3.4 Status transitions exempt on INSERT

Accepted. The seed and the FHIR import need to write history. Condition: API services insert rows only in their initial status. WP 3.1 adds an `initialStatus` map to `packages/db/src/status.ts` and uses it in every create path; C2 checks this by reading the repositories. If any service is found inserting a later status, an insert trigger with a seed-only bypass is added then.

### 3.5 Zod contracts location

`packages/shared`, as ADR-13 says. Move now, in WP 3.0, before any UI work. Layout: `packages/shared/src/contracts/<domain>.ts`, re-exported from `@carepath/shared/contracts`. The error code table and envelope move too; the web app needs the codes. `apps/api` routes import the schemas; `apps/api/openapi.json` stays the generated wire reference. Owner: the opus API worker. UI workers never edit contracts; they append requests to `docs/decisions/contract-requests.md`.

### 3.6 `start` through tsx

Accepted for this demonstration. `tsx` moves to `dependencies` of `apps/api`. `apps/api` `build` becomes a no-emit type check, so no unrunnable `dist` is produced. The README and deployment notes say the API runs TypeScript through tsx and that no compiled artifact has been produced or tested. Packaging `@carepath/db` for plain Node is cut.

### 3.7 PRD decisions

| Item | Ruling |
|---|---|
| Coordinator reads (Q2) | Organization-wide for administrative fields. No caseload model. Coordinators and admins have no `clinical.read`; directory and record endpoints return an administrative shape for them. `metrics.read` for coordinators and `enrollment.manage`, `assignment.manage` for admins are confirmed. Coordinators can read message bodies through `message.org`; say so in the threat model |
| Record history versus audit log | Approved. Record history is built from domain rows (plan versions, signatures, check-in reviews, task resolutions). `AuditEvent` stays admin-only. In Phase 3 the section shows only what Phase 3 data supports |
| Default rule thresholds | Approved as demo defaults: pain 7, missed sessions 2 in 7 days, unreviewed check-in 48 hours, follow-up within 48 hours, intake incomplete 3 days. Stored in `ReviewRule.params`, labelled in the admin UI and docs as arbitrary demo values. The seed must use the same values |
| Session timeouts | Approved: 30 minutes idle, 12 hours absolute, all roles. The web app must handle `session_expired` by returning to sign-in with a plain message and the return path |
| Emergency copy (Q5) | Approved as written: "Not monitored for emergencies. If this is an emergency, call 911." Fixed text in one shared constant, not an organization setting. The pain notice uses `Organization.phone`; with no phone it reads "contact your clinic" |
| Banned diagnostic terms | Apply only to the onboarding review step and the pain notice (AC-A9, AC-D7). Not a global copy linter: "you have" appears in ordinary sentences |
| Q1, Q3, Q4 | As proposed: approved summaries do not reach patients in Core; patient access history is Stretch; required consent is withdrawn through an admin action |
| PRD length | Accepted at its current length. It is a table-heavy reference; trimming costs more than it returns. No further growth: changes go in checkpoint notes |

**PRD section 9 conflicts with the schema. The schema wins:**

| PRD section 9 | Ruling |
|---|---|
| Patient status includes `assigned` | Not added. Assignment moves `awaiting_assignment → active`. "Has a published plan" is derived from `CarePlan`. `discharged` stays |
| `CarePlanVersion` `draft → published → superseded` | The draft lives in `CarePlan.draftContent`. Versions exist only once published. "Superseded" is derived from `currentVersionId` |
| `ExerciseSession` `stopped_discomfort` | Added to the schema (M2) |
| `ReviewTask` `open → assigned → resolved` | Schema states: `open`, `in_review`, `resolved`, `dismissed`. Assignment is the `assignedPractitionerId` column |
| `AIGeneration` four failure states | Schema states plus an error code in `error`. Revisit in WP 5.1 |

A haiku pass updates PRD section 9 to match after M2 lands.

### 3.8 Time in tests and demos

The seeded world is fixed at one instant; the server clock is not. Without a ruling, Playwright scenarios A and C fail the day after they are written.

- The end-to-end stage seeds with the default anchor and starts the API with `CAREPATH_FIXED_NOW=<anchor>`. `server.ts` honours it only when `NODE_ENV` is not `production` and logs one warning line at start. Playwright sets the browser clock to the same instant.
- Screens take "today" and due states from API responses, never from the browser clock.
- `pnpm db:seed --anchor now` (rounded down to the hour) is added for hand demos. A seed test runs the integrity checks on three anchors falling on different weekdays.

## 4. Concurrency: one cluster, many workers

Cause: workers share one checkout and one cluster. Three collisions exist: gates stop the cluster, gates truncate the shared database, and the web build writes one `.next` directory.

Rules for every Phase 3 worker:

1. **Never call `scripts/db.sh stop` or `reset` from a gate.** Gates use `acquire` and `release`.
2. **Every gate uses its own database**, created at start and dropped at exit. The name `carepath` is reserved for hand use by the orchestrator. A worker who wants a database that persists between gates names it `carepath_wp31`, `carepath_wp32` or `carepath_wp33`.
3. **Ports**: verify 4090 and 3090; WP 3.1 4031; WP 3.2 4032 and 3032; WP 3.3 4033 and 3033. Never 4000 or 3000 in a gate.
4. **The web build, `next start` and Playwright run under one lock** (`scripts/with-web-lock.sh`). UI workers do not run `next dev`; they iterate through their gate.
5. **Work package gates lint, type-check and test only the paths the package owns.** Full `pnpm verify` is run by the orchestrator at integration points, when no worker is mid-edit.
6. **Commits name paths explicitly.** Never `git add -A`. A dependency change is its own commit, made immediately after `pnpm install`, so `pnpm-lock.yaml` is never left dirty for another worker.

### Script changes (part of WP 3.0, M1)

`scripts/db.sh`:

```bash
DB_NAME="${CAREPATH_DB:-carepath}"
case "$DB_NAME" in ""|*[!a-z0-9_]*) echo "db: CAREPATH_DB must match [a-z0-9_]+" >&2; exit 2 ;; esac
LEASES="$DATA_ROOT/pg-leases"
LOCK="$DATA_ROOT/pg.lock"

locked() { mkdir -p "$DATA_ROOT" "$LEASES"; exec 9>"$LOCK"; flock 9; }
live_leases() {            # prints live lease pids, removes dead ones
  local f pid
  for f in "$LEASES"/[0-9]*; do
    [ -e "$f" ] || continue
    pid="${f##*/}"
    if kill -0 "$pid" 2>/dev/null; then echo "$pid"; else rm -f "$f"; fi
  done
}
```

- `start`: unchanged, except it creates `$DB_NAME`. Takes the lock.
- `acquire`: requires `DB_LEASE_PID`. Under the lock: if the cluster is not running, start it and `touch "$LEASES/.started-by-lease"`; ensure `$DB_NAME` exists; `touch "$LEASES/$DB_LEASE_PID"`.
- `release`: requires `DB_LEASE_PID`. Under the lock: remove the own lease; if `live_leases` prints nothing and `.started-by-lease` exists, stop the cluster and remove the marker. A cluster started by hand with `start` is never stopped by `release`.
- `drop`: drops `$DB_NAME` `WITH (FORCE)`. Refuses when `DB_NAME=carepath`.
- `stop` and `reset`: under the lock, refuse with exit 3 and a list of pids when `live_leases` prints anything, unless `--force` is given. `stop` removes the marker.
- `status`: unchanged.

New `scripts/gate-env.sh`, sourced by `verify.sh` and every `gate-wp-*.sh`:

```bash
# usage: source scripts/gate-env.sh <name> <api_port> [web_port]
export DB_LEASE_PID=$$
export CAREPATH_DB="carepath_${1}_$$"
export DATABASE_URL="postgresql://carepath:carepath@127.0.0.1:${DB_PORT:-54329}/${CAREPATH_DB}"
export API_PORT="$2" WEB_PORT="${3:-}"
[ -n "$WEB_PORT" ] && export CORS_ORIGINS="http://127.0.0.1:${WEB_PORT}"
scripts/db.sh acquire
trap 'scripts/db.sh drop >/dev/null 2>&1 || true; scripts/db.sh release || true' EXIT
```

New `scripts/with-web-lock.sh`: `mkdir -p .data && exec flock .data/web.lock "$@"`.

`scripts/verify.sh`: replace the `cleanup` trap and the `db start` stage with `source scripts/gate-env.sh verify 4090 3090`. Migrate and seed then run against a fresh database on every run. Wrap the build and the end-to-end stage in `scripts/with-web-lock.sh`. Convert `gate-wp-2.4.sh` and `gate-wp-2.6.sh` to `gate-env.sh` or delete them.

Acceptance for M1: with `CAREPATH_DB=carepath_hold DB_LEASE_PID=$$ scripts/db.sh acquire` held in one shell, two `pnpm verify` runs started together in two other shells both exit 0, the cluster is still up afterwards, `carepath_hold` is untouched, and no `carepath_verify_*` database remains. Paste the output into PROGRESS.

## 5. Phase 3

### 5.1 Order

```
WP 3.0 (opus, serial)  →  WP 3.1 (opus)  ─────────────────────────────→
                       →  WP 3.2a (sonnet, serial)  →  WP 3.2b (sonnet) →
                                                    →  WP 3.3  (sonnet) →
```

- 3.2a starts when 3.0 is committed. 3.2b and 3.3 start when 3.2a is committed, in parallel with each other and with 3.1.
- UI workers build against the committed contracts and the route table. They do not add mock servers or fixture responses to application code.
- A UI gate can only close once the 3.1 endpoints it calls exist. To keep UI workers unblocked, 3.1 ships read endpoints first; the seed already holds the data.

### 5.2 Web to API

One origin. `next.config.ts` rewrites `/api/:path*` to the API. The browser only ever talks to the web origin, so the session cookie is first-party and the `__Host-` prefix works. Server components call the API directly and forward the incoming `cookie` header; they only issue GETs. Client mutations go through `/api` with `x-csrf-token` from `GET /auth/session`. The API gains a `TRUST_PROXY` setting (loopback only) so rate limits see the forwarded client address; if the Next rewrite does not forward it, record that the per-address limit is per deployment in this demo. `NEXT_PUBLIC_API_URL` is removed from `.env.example`.

### 5.3 WP 3.0, opus: must-fix before any feature work

| # | Item |
|---|---|
| M1 | Concurrency scripts, section 4, with its acceptance run |
| M2 | One migration, `phase3_alignment`: `AuditActorType.anonymous` with its check; `SessionActivity.skipReason` (null unless `skipped`); `ExerciseSessionStatus.stopped_discomfort` with transitions from `in_progress` and `paused`; `EnrollmentCode` (organization, unique code hash, expiry, redeemed-at, redeemed-by patient); `Organization.phone` and `replyTimeText`; one generic trigger enforcing same-patient parents for the six cases in section 1 (WP 2.3, defect 1), each with a rejection test. Update `status.ts`, ERD, domain model, seed, integrity checks, demo-accounts (list the demo codes: unused, used, expired) |
| M3 | Contracts moved to `packages/shared` (ruling 3.5); `TRUST_PROXY`; route table `docs/architecture/api-phase3.md` listing, for every Scenario A to D endpoint: method, path, permission, request and response schema names, error codes |
| M4 | `AuditWriter` accepts a transaction client. A `withTx(ctx, fn)` helper runs a mutation and its audit event in one transaction. Test: a forced audit failure leaves no changed row |
| M5 | Error handler maps 23P01, 23505, CP001, CP003 to 409 with specific codes. Tests |
| M6 | `tsx` to dependencies; API `build` no-emit (ruling 3.6) |
| M7 | CI seed step; PROGRESS corrected for WP 2.2 |

Gate: `pnpm verify` exit 0 on the new scripts, plus the M1 acceptance run.

### 5.4 WP 3.1, opus: API for Scenarios A to D

- **One route family.** Patient-owned resources live under `/patients/:patientId/...` for every role. No `/me` aliases; the patient client takes its id from `/auth/session`. Exception: `POST /onboarding/accounts` (public) takes email, password and eligibility code in one request, so an invalid or reused code creates no account (AC-A3). The UI may still present two steps.
- **Delivery order:** (1) patient reads: today, current plan and version diff, sessions, check-ins, progress, organization card; (2) session and check-in writes, including resume, skip with reason, stop for discomfort, and the pain rule evaluated in the check-in transaction; (3) clinician reads: overview lists, directory, record sections, timeline, exercise library, review queue; (4) plan draft autosave, preview, publish with change note and computed diff; (5) review task assign, resolve, dismiss; check-in reviewed; review rule read and update; (6) onboarding, intake autosave and submit, consents, assignment.
- **M8, hard gate:** an enumeration test reads the OpenAPI document and calls every route that has a tenant id in its path with an organization B session and an organization A id, expecting 404 and a `security.access_denied` event. It also calls each as patient 2 with patient 1's ids. A route with a path id that the test has no fixture for fails the test. Child resources (`sessionId`, `taskId`, `checkInId`, version ids) are looked up through one scoped helper per resource, never by bare id.
- Time-based rules and the 24-hour session abandonment run as job handlers scoped by `job.organizationId`. One open task per rule and source comes from the partial unique index with `ON CONFLICT DO NOTHING` (AC-D2).
- Preview and the patient plan endpoint render through the same serializer (REQ-PLN-05). A draft never appears in any patient response (AC-B1).
- Every create uses `initialStatus` (ruling 3.4). Every mutation and its audit event share a transaction (M4).
- Gate: API tests for A to D including resume of an interrupted session, the rule explanation payload and M8; `pnpm openapi:check`; scoped lint and type check; via `gate-env.sh wp31 4031`.

### 5.5 WP 3.2, sonnet: patient UI

**3.2a, web foundation (serial, first).** Owns `apps/web/lib/**`, `next.config.ts`, the root layout, `(public)/login`, the Playwright config and end-to-end harness. Delivers: the `/api` rewrite; server and client API helpers typed from `@carepath/shared/contracts`; the TanStack Query provider; envelope handling including `session_expired`; sign-in and demo entry that performs a real login as a seeded account; server-side role guard in each route-group layout; sign-out; the three shells with the demonstration notice; the ESLint rule banning raw hex and arbitrary Tailwind values in `apps/web`; the end-to-end stage of `verify.sh` (seed, fixed clock, API and web on gate ports, Playwright with axe, under the web lock). Gate: Playwright signs in as each of the four demo roles, lands in the right shell, is refused the other shells, and signs out; axe has no serious or critical findings on sign-in.

**3.2b.** Owns `apps/web/app/(patient)/**` only. Onboarding, Today, session player, check-in, progress, Sharing and consent. The tab bar lists only destinations that work in this phase (Today, Progress); Appointments and Messages appear in Phase 4. Rev1 accessibility items apply. Gate as planned: Playwright A and C at 390 by 844 with one keyboard-only pass, axe with no serious or critical findings, via `gate-env.sh wp32 4032 3032`.

### 5.6 WP 3.3, sonnet: clinician UI

Owns `apps/web/app/(clinician)/**` only. Overview work lists, directory, two-pane record, plan builder with move buttons and patient preview, review queue. The left rail lists only Overview, Patients and Review queue in this phase. No "On track" or similar labels. Coordinators and admins get no screens until Phase 6. Gate as planned: Playwright B and D at 1440 by 900, plus the cross-role test (publish as clinician, patient sees the new version and change note), via `gate-env.sh wp33 4033 3033`.

### 5.7 Shared rules for 3.2 and 3.3

- Need a new primitive in `packages/ui`? One worker owns `packages/ui` at a time: 3.2 has it by default; 3.3 requests in `contract-requests.md`.
- Need a contract change? Request it; do not work around it with client-side reshaping.
- A screen whose endpoint is not yet delivered is not merged with placeholder data. It waits.

## 6. Carried to later checkpoints

- C2: read the repositories for `initialStatus` use and scoped lookups; decide appointment and slot consistency for WP 4.1; confirm the M8 test fails when a new unscoped route is added.
- WP 8.2: audit immutability wording; coordinator access to message bodies; superuser application role; in-memory rate limiting; no account lockout beyond rate limits.
