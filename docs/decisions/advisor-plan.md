# CarePath — Advisor Plan

Date: 2026-11-19. Scope: direction for Phases 2–9. Synthetic data only; not for clinical use.

Environment facts this plan depends on (checked in this workspace):

- Docker CLI is installed but **no daemon is running**. Compose cannot be verified here.
- PostgreSQL 16 **server** binaries exist at `/usr/lib/postgresql/16/bin` and a `postgres` OS user exists. We run as root, so the cluster must be started as `postgres`.
- Servers do not survive between turns. Every gate must be one command that starts what it needs, tests, and tears down.
- 2 CPUs, 7 GB RAM. Benchmarks are small-machine numbers and must be reported as such.

## 1. Scope assessment

The brief describes several months of team work. Built evenly, it produces a wide, shallow product with dead buttons. We build a narrow product where everything on screen works, and list what was cut.

### Must-work core (Scenarios A–I, all real, all tested)

| Area | In |
|---|---|
| Patient | Onboarding (autosave, resume), Today, guided session (timer, pause, skip, discomfort, resume), check-in, progress, appointments, messaging, navigation assistant |
| Clinician | Overview, patient directory (server-side search/sort/filter/paginate), patient record with timeline, care plan builder (draft, publish, versions), review queue with rule explanations, SOAP notes (draft, finalize, versions) |
| Admin | Enrollment and clinician assignment, availability, computed metrics, audit viewer, read-only role matrix |
| Platform | Session auth, RBAC, org isolation, audit log, booking concurrency guarantee, Postgres-backed jobs with retry, OpenAPI |
| AI | Provider interface, deterministic provider, progress summary and note draft with evidence links, review/approve/reject, eval script |
| FHIR | 10 resource mappers, Bundle export, reference validation, import with duplicate detection |
| Quality | Unit + API integration + Playwright + axe, seed at brief scale, measured benchmarks, both case studies |

### Stretch (only after checkpoint C3 passes)

Saved filters; live LLM provider run with a real key; Medplum sandbox push; installable PWA polish beyond manifest and app-shell worker; landing page art; Storybook; editable roles; Postgres row-level security as a second isolation layer; motion tracking (Phase 9).

### Cut or reduced, stated openly in docs

- **Python/FastAPI AI service, Redis, BullMQ, Turborepo, three separate frontends**: replaced, see ADRs.
- **Storybook**: replaced by an in-app `/design-system` gallery route that Playwright can screenshot.
- **WebSockets**: polling.
- **Synthea generator run**: needs Java and downloads. Use our own deterministic generator for the 1,000 patients; import a small set of Synthea sample bundles from GitHub only if fetchable. Otherwise record "not run".
- **Official HL7 validator**: probably unreachable. "Valid FHIR Bundle" means "passes CarePath's defined structural and reference validation", and the docs say exactly that.
- **Usability testing**: scenarios and method only. No participants exist.
- **Deployment**: documentation and config only unless a live URL is actually produced.
- **Docker Compose**: file is written, marked unverified in this environment.

## 2. Architecture decisions

**ADR-1 One Next.js app, not three.** `apps/web` with route groups `(patient)`, `(clinician)`, `(admin)`, `(public)`. Each group has its own layout, navigation and density theme. Reason: one build, one auth boundary, one Playwright target. Distinctness comes from layouts and workflows, not from separate deployables.

**ADR-2 Fastify API, not NestJS.** `apps/api`: Fastify 5, Zod schemas via `fastify-type-provider-zod`, OpenAPI generated from the same schemas. Modules by domain folder (`modules/scheduling/{routes,service,repo}.ts`). Reason: structured enough, far less boilerplate, and `app.inject()` gives API tests with no listening server. Next.js route handlers were rejected because k6, OpenAPI and the job worker want a real service.

**ADR-3 PostgreSQL 16 + Prisma, native cluster locally.** `scripts/db.sh start|stop|reset` runs `initdb`/`pg_ctl` as `postgres` on port 54329 under `.local/pg`. `docker-compose.yml` is provided for other developers. Constraints Prisma cannot express (exclusion, partial unique, check) go in raw SQL migrations.

**ADR-4 No Redis, no BullMQ.** A `Job` table claimed with `FOR UPDATE SKIP LOCKED`, attempts, backoff, dead state; worker loop in the API process plus a `jobs:drain` CLI for tests. Rate limiting with `@fastify/rate-limit` in memory. Reason: one datastore, deterministic tests. Limitation documented: single instance only.

**ADR-5 TypeScript-only AI in `packages/ai`.** `LLMProvider` interface; `DeterministicProvider` (rule-based extraction over source records, always labelled as demo output in API and UI) and an `AnthropicProvider` enabled by env key. Shared pipeline: prompt registry with versions, Zod output schema, timeout, bounded retry, token and cost record, evidence check. Reason: a Python service adds a second runtime and a network hop for no demonstrated capability.

**ADR-6 Evidence model.** Every generated statement carries `sourceRefs: [{type, id, field}]`. A server-side verifier resolves each ref inside the same patient and org; statements with none or unresolvable refs are flagged `unsupported` and shown as warnings. Unsupported-statement rate is computed from this verifier. Before any external provider call, a redaction step replaces names, dates of birth and contact fields with tokens. Source text (messages, transcripts) is passed as delimited data and never as instructions; the injection test set proves outputs stay in schema.

**ADR-7 Auth: DB sessions, HttpOnly SameSite=Lax cookie, scrypt hashes.** Origin check on mutating requests. No auth library. Demo entry performs a real login as a seeded account; role switching is a real logout and login.

**ADR-8 Isolation in one place.** Routes get a `ctx` (userId, orgId, role, patientId?). Repositories require `ctx` and always filter on `orgId`; patients are further limited to their own `patientId`. Cross-scope lookups return 404 and write a `security.access_denied` audit event. An ESLint rule bans importing the Prisma client outside `repo.ts` files.

**ADR-9 Booking integrity in the database.** `Appointment` has an exclusion constraint on `(practitionerId, tstzrange(startsAt, endsAt))` and one on `(patientId, range)`, both `WHERE status = 'booked'`. Booking is a transaction that locks the slot row; constraint violation maps to HTTP 409. All timestamps UTC; display uses the viewer's IANA zone.

**ADR-10 Care plan versions are immutable.** Publishing creates a new `CarePlanVersion` and moves `CarePlan.currentVersionId`. Sessions reference the version they ran against. Notes and AI reviews follow the same append-only pattern.

**ADR-11 FHIR as pure functions.** `packages/fhir`: `toFhir`/`fromFhir` per resource, types from `@medplum/fhirtypes`, Zod structural validators, reference-integrity check, duplicate detection by identifier system+value.

**ADR-12 Polling, not push.** TanStack Query refetch (messages 5 s while open, queue 30 s).

**ADR-13 pnpm workspaces only.** Packages: `apps/web`, `apps/api`, `packages/{db,ui,ai,fhir,shared}`. `shared` holds Zod contracts used by both apps.

**ADR-14 One gate command.** `pnpm verify` = db start → migrate → seed (small profile) → typecheck → lint → unit → API integration → build → start servers in background → Playwright + axe → stop everything. Exit code is the truth.

## 3. Work breakdown

Rule for every package: the worker runs the gate and pastes real output into `docs/progress.md`. Not complete until the gate exits 0. Pin exact dependency versions.

### Phase 2 — Foundation

| WP | Owner | Inputs | Outputs | Gate |
|---|---|---|---|---|
| 2.1 Monorepo, tooling, `CLAUDE.md`, `scripts/db.sh`, `pnpm verify` skeleton, compose file, CI workflow | sonnet | this plan | root config, `scripts/`, `.github/workflows/ci.yml` | `pnpm install && pnpm typecheck && pnpm lint && scripts/db.sh start && pg_isready -p 54329` |
| 2.2 Tooling probe: Playwright Chromium, k6 or autocannon, font packages | haiku | 2.1 | `docs/decisions/tooling-probe.md` | `pnpm exec playwright install chromium` then a script that screenshots `about:blank`; failures recorded, not hidden |
| 2.3 Schema, raw-SQL constraints, ERD | opus | brief §11, ADR-9/10 | `packages/db/prisma/**`, `docs/architecture/erd.md` | `pnpm db:reset && pnpm --filter db test` (constraint tests: overlap rejected, cross-org FK rejected, illegal status transition rejected) |
| 2.4 API core: auth, ctx, scoped repos, error envelope, audit, rate limit, OpenAPI, job runner | opus | 2.3, ADR-2/4/7/8 | `apps/api/src/core/**` | `pnpm --filter api test core` covering login, role denial, cross-org 404 + audit row, job retry then dead; `pnpm openapi:check` |
| 2.5 Tokens and UI primitives, `/design-system` route | sonnet | §4 below | `packages/ui/**` | `pnpm --filter ui test` including a token contrast test; Playwright screenshots of gallery in patient and clinician themes |
| 2.6 Seed generator, small profile (2 orgs, 20 patients) | sonnet | 2.3 | `packages/db/seed/**` | `pnpm db:seed --profile small` twice gives identical row checksums |

### Phase 3 — Vertical slice (Scenarios A, B, C, D)

| WP | Owner | Outputs | Gate |
|---|---|---|---|
| 3.1 API: onboarding, assignment, care plan CRUD/publish/versions, sessions, check-ins, review rules engine | opus | `apps/api/src/modules/{intake,careplan,session,review}` | API tests for A–D, including resume of interrupted session and rule explanation payload |
| 3.2 Patient UI: onboarding, Today, session player, check-in, progress | sonnet | `apps/web/app/(patient)/**` | Playwright A and C at 390×844; axe has no serious or critical findings |
| 3.3 Clinician UI: overview, directory, record, plan builder, queue | sonnet | `apps/web/app/(clinician)/**` | Playwright B and D at 1440×900; one cross-role test: publish as clinician, patient sees new version |

### Phase 4 — Scheduling and communication (Scenario E)

| WP | Owner | Outputs | Gate |
|---|---|---|---|
| 4.1 Availability, booking, reschedule, cancel, reminders as jobs | opus | `modules/scheduling` | Concurrency test: 50 parallel bookings for one slot → exactly 1 success, 49 × 409, repeated 20 times |
| 4.2 Messaging and notifications API | sonnet | `modules/messaging` | Tests for unread counts, failure state, participant-only access |
| 4.3 UI for appointments and messages, both roles | sonnet | web routes | Playwright E; emergency notice visible in composer |

### Phase 5 — AI and FHIR (Scenarios F, G)

| WP | Owner | Outputs | Gate |
|---|---|---|---|
| 5.1 AI pipeline, deterministic provider, evidence verifier, redaction | opus | `packages/ai/**` | `pnpm --filter ai test`: schema validity, timeout, retry, injection set, redaction |
| 5.2 Summary and note endpoints, AIGeneration/AIReview, approval flow | opus | `modules/ai` | API test F: generate → edit → approve; audit shows generation and review; note cannot finalize without human action |
| 5.3 AI review panel, evidence inspector, SOAP editor, assistant | sonnet | web routes | Playwright F; provider label visible on every generated block |
| 5.4 FHIR mappers, Bundle, validation, import | opus | `packages/fhir/**`, `modules/fhir` | Round-trip tests for 10 resources; exported Bundle has zero dangling references; import of a broken Bundle returns itemised errors |
| 5.5 50 synthetic encounter transcripts with expected facts | haiku, reviewed by opus | `packages/ai/evals/data/*.json` | `pnpm ai:eval` writes `docs/evaluation/ai-eval.md` |

### Phase 6 — Administration (Scenarios H, I)

| WP | Owner | Outputs | Gate |
|---|---|---|---|
| 6.1 Admin API: enrollment, assignment, availability, metrics SQL, audit query | sonnet | `modules/admin` | Metric tests compare endpoint output to independent SQL counts on the seed |
| 6.2 Admin UI | sonnet | `apps/web/app/(admin)/**` | Playwright H and I |
| 6.3 Full seed profile (1,000 patients, 90 days, edge cases) | haiku | seed data tables | `pnpm db:seed --profile full` under 3 minutes; `pnpm seed:report` writes actual counts |

### Phase 7 — Visual refinement

| WP | Owner | Outputs | Gate |
|---|---|---|---|
| 7.1 Screenshot audit of every route at 390, 768, 1440 against §4 | opus | `docs/design/audit.md` with defect list | Screenshots exist for all routes |
| 7.2 Fixes | sonnet | code | Re-run shows each defect closed; `pnpm verify` green |
| 7.3 Assets optimised, manifest | haiku | `apps/web/public/assets/**`, `asset-manifest.json` | Script confirms every manifest entry exists, is WebP/AVIF/SVG, and is referenced in code |

### Phase 8 — Testing and documentation

| WP | Owner | Outputs | Gate |
|---|---|---|---|
| 8.1 Coverage, load test, a11y report, bundle size | sonnet | `docs/evaluation/*.md` with raw output files | `pnpm bench` regenerates every number from scratch |
| 8.2 Threat model, security review | opus | `docs/security/threat-model.md` | Each mitigation links to a passing test or is marked "not implemented" |
| 8.3 Design case study, engineering case study, README | sonnet | `docs/case-studies/*` | `pnpm docs:check` (WP 8.4) passes |
| 8.4 Claims linter and metrics cross-check | haiku | `scripts/docs-check.ts` | Fails on banned phrases (§6) and on any number in case studies not present in `docs/evaluation/metrics.json` |

### Phase 9 — Motion tracking (stretch)

| WP | Owner | Outputs | Gate |
|---|---|---|---|
| 9.1 Local pose demo behind a flag, manual fallback | opus | `(patient)/session/motion` | Rep-counter unit tests on recorded landmark fixtures; Playwright confirms permission-denied path falls back to manual. Real camera behaviour is reported as untested. |

## 4. Design guardrails

One token set, two themes selected by `data-theme` on the route-group layout. Values below were contrast-checked; the token test in WP 2.5 enforces them.

**Type.** Self-hosted through Fontsource, no CDN. IBM Plex Sans for all interface text, IBM Plex Mono for IDs, timestamps and dosage-like figures, Source Serif 4 for patient headings only. Tabular numerals in every table and chart.

| | Patient | Clinician/Admin |
|---|---|---|
| Body | 17/26 | 13/18 in tables, 14/20 elsewhere |
| Scale | 15, 17, 20, 24, 30, 38 | 12, 13, 14, 16, 20, 24 |
| Headings | Source Serif 4, 600 | Plex Sans, 600 |
| Min target | 48 px | 32 px, 24 px floor |
| Row height | n/a | 36 px |
| Line length | 60 characters max | free |

**Colour.**

| Token | Patient | Clinician |
|---|---|---|
| bg | `#F5F2EA` warm paper | `#F6F7F6` cool neutral |
| surface | `#FFFFFF` | `#FFFFFF` |
| ink | `#1B2622` | `#17201D` |
| ink-muted | `#55615C` | `#56625E` |
| primary | `#1E4D40` forest, white text | same, used only for primary action and selection |
| control border | `#76817C` | `#76817C` |
| focus ring | `#0B5FA5`, 2 px + 2 px offset | same |
| success / warning / error / info (text on tint) | `#1E5A3A` on `#E5F1E8`, `#7A4A00` on `#FBF0D9`, `#8E2A1E` on `#FBE9E5`, `#1F4E6B` on `#E6F0F5` | same |

No purple, no gradients, no glass. The blue is reserved for focus and informational states.

**Shape and depth.** 4 px spacing grid. Radius 6 for controls, 10 for containers, nothing larger. 1 px borders separate surfaces; shadows only on dialogs, drawers and popovers. Motion 120 ms and 200 ms ease-out, none on list entry, all removed under `prefers-reduced-motion`.

**Layout rules.**

- Patient Today: one dominant action block ("Start today's session"), then a plain list of secondary items. No grid of equal cards. Bottom tab bar with four text-labelled destinations.
- Clinician: left rail, dense tables, patient record as a two-pane layout with a persistent patient header. No KPI tile rows on the overview; it is a set of work lists with counts.
- Admin: same shell as clinician with different navigation; metrics appear as tables with small inline charts.

**Status language.** Clinical statuses (discomfort reported, needs review) are filled chips with an icon. Administrative statuses (intake incomplete, unscheduled) are outlined tags. Never colour alone.

**AI content.** A dashed left rule, the label "Draft, generated, not reviewed", and the provider name ("Demo provider, rule-based" or the model). No sparkle icons. Evidence opens in a side panel showing the source record.

**Charts.** Forest plus neutrals, direct labels, a data-table alternative for each. Pain charts are titled "Patient-reported pain". No engagement chart is captioned as improvement.

**Copy.** Plain sentences, second person for patients, no exclamation marks, no placeholder text anywhere.

## 5. Checkpoints and risks

**Consult the advisor at:**

- **C1** after 2.3 and 2.4: schema, isolation and auth review before any feature work.
- **C2** after Phase 3: is the slice real end to end? Decide what Phase 4–6 scope survives.
- **C3** after 5.2: evidence model and honesty of AI labelling; release stretch tier or not.
- **C4** at 7.1: design audit against §4 with screenshots.
- **C5** before 8.3 is finalised: claims audit of every document and the resume bullets.
- Also on: any gate failing twice, any proposed new dependency or service, any schema change after C1.

**Top risks.**

| # | Risk | Mitigation |
|---|---|---|
| 1 | Breadth beats depth; dead buttons ship | Phase 3 gate blocks expansion; a route with no working action is removed, not stubbed |
| 2 | Browser download blocked, no Playwright | WP 2.2 probes first; fallback is system Chromium, then API-level scenario tests plus a stated gap |
| 3 | Postgres will not start as root or state is lost between turns | `scripts/db.sh` runs as `postgres`; `pnpm verify` always rebuilds from migrations and seed |
| 4 | Org isolation leak | Single scoped-repo path, lint rule, a test that calls every patient-scoped route with a foreign-org session |
| 5 | Double booking under race | Database exclusion constraint, not application checks; repeated concurrency test |
| 6 | Deterministic provider presented as real AI | Provider label stored on `AIGeneration` and rendered in UI; docs linter |
| 7 | Parallel workers conflict in shared files | Schema and `packages/shared` contracts owned by opus; UI workers consume, never edit; one WP per directory |
| 8 | Generic look creeps back | Tokens only, lint rule banning raw hex and arbitrary Tailwind values in `apps/web`; C4 audit |
| 9 | Fabricated or stale numbers in case studies | `metrics.json` produced by `pnpm bench`; linter cross-checks |
| 10 | Dependency version drift (Next, Prisma, Fastify, Zod majors) | Exact pins in 2.1, lockfile committed, no upgrades without advisor |

## 6. Honesty rules

Never state or imply:

- That CarePath is HIPAA compliant, HIPAA ready, certified, FDA cleared, or clinically validated. Permitted: "implements selected security controls; not assessed for compliance".
- That the review queue predicts clinical risk. It applies configurable administrative rules.
- That AI output is from a live model when the deterministic provider produced it, or that an unrun live provider was evaluated.
- That pose tracking judges exercise correctness or safety.
- That FHIR output passed the official HL7 validator, that Synthea was run, or that a sandbox or EHR integration works, unless each was actually done and logged.
- That Docker Compose, deployment, or a live URL works unless verified.
- Any interview, participant, quote, usability result, customer, or outcome. Personas are labelled "assumption-based, not from research participants".
- Any metric that is not in `docs/evaluation/metrics.json` from a recorded run. Targets are written as targets.
- That passing axe means WCAG 2.2 AA conformance. Say "automated checks passed; manual review covered X".
- Affiliation with any competitor, or that Mobbin or any product was inspected when it was not.

Every app shell shows "Demonstration product. Synthetic data. Not for clinical use." Messaging shows "Not monitored for emergencies." Exercise content is labelled fictional and not medically reviewed.
