# Checkpoint C2: is the vertical slice real

Date: 2026-11-20. Reviewer: advisor. Scope: WP 3.0, 3.1, 3.2a, 3.2b and 3.3 at commit `0a24d48`, before any Phase 4 work. Where this note differs from `advisor-plan.md`, `advisor-plan-rev1.md` or `checkpoint-c1.md`, this note wins.

**Decision: the slice is real. Go for Phase 4, after WP 3.4 (section 4).** No work package is rejected. One part of the slice has no screen: a coordinator cannot assign a therapist in the UI, so Scenario A to D only joins up through an API call. That hole is closed in WP 3.4 before new scope starts.

## 0. What was checked

- **`pnpm verify` in a clean worktree of `0a24d48`** (`/home/claude/cp-c2`, own install, cluster started by the lease): exit 0, no skipped stages. Seed 72 integrity checks; ui 106, db 61, api 160 tests; lint and format clean; build; end-to-end 41 passed, 11 skipped (the patient scenarios are written for 390 wide and skip at 1440 on purpose).
- **M8, reproduced independently.** I added a route of my own to the worktree, `GET /patients/:patientId/check-ins/:checkInId/c2-probe`, which checks the patient and then reads the check-in by bare id. The enumeration test failed 1 of 5 with `c2-probe as A patient: 200 {"id":"d09c192f-…","painScore":9}` and `no role reached the child scope check`. Route removed, file restored. The gate does what C1 asked.
- **`initialStatus`.** Read every `create`, `createMany` and raw `INSERT` in `apps/api/src`. Every table that has a status machine takes its first status from the map: care-team `repo.ts:89`, sessions `repo.ts:137` and `:148`, check-ins `repo.ts:123`, review `repo.ts:45`, consents `repo.ts:75`, onboarding `repo.ts:73`, `:89`, `:99`, care-plans `repo.ts:269` and `:419`. The rows inserted without it (`PatientCheckIn`, `CarePlanVersion`, `ExerciseAssignment`, `CareTeamMember`, `Notification`, `User`, `AuthSession`, `AuditEvent`) have no status machine. Ruling 3.4 holds; no insert trigger is needed.
- **Walk in a browser.** Playwright on system Chrome, own database (`carepath_c2walk_<pid>`), API 4095, web 3095, default rate limits, fixed clock. A new patient (Robin Advisor, code `CAREPATH-1-START-2`) completed all onboarding steps at 390 wide; the coordinator assigned Terry Demotherapist (through the API, see 1.1); the therapist found the patient in the directory, built a three-exercise plan, reordered it, previewed and published version 1; the patient saw the plan on Today, completed the session, sent a check-in with pain 8 and saw the clinic notice; the therapist found exactly one "Reported pain 8 of 10" task, assigned it, marked the check-in reviewed and resolved it with a note; the record timeline showed all four events. 52 screenshots taken and read. 169 API requests in the whole walk, no 429.
- Read the worker screenshots in `docs/screenshots/3.2b` and `3.3`.
- Not checked: Safari, Firefox, a real phone, a screen reader, CI (never run), Docker Compose, two gates running at once in two worktrees (section 6 explains why that needs a script change first).

## 1. Verdict per work package

| WP | Verdict |
|---|---|
| 3.0 C1 must-fixes | Accept |
| 3.1 API, Scenarios A to D | Accept with fixes |
| 3.2a Web foundation | Accept with fixes |
| 3.2b Patient UI | Accept with fixes |
| 3.3 Clinician UI | Accept with fixes |

Design, in one paragraph: this does not look like a template. The patient side has one dominant action, serif headings on warm paper, plain second-person copy and honest labels ("These are counts and your own ratings, not a measure of recovery"). The clinician side is work lists with counts, not tiles, and the review task explains itself with rule, value and threshold. The weak spots are density in the review queue, a tile row on the patient record, status chips that say nothing, and a patient session that is all text. They are listed below and none is structural.

### 1.1 The slice

- **No screen for assignment.** `POST /patients/:patientId/care-team/assignments` works, but `/admin` is an empty state for both coordinator and admin, and the sign-in card says "Screens arrive in a later phase" (`apps/web/lib/demo-accounts.ts:35`, `:41`). A patient who finishes onboarding stays at "Your details are with the clinic" until someone calls the API. Fix: F1.
- **The therapist never sees the intake.** No file under `apps/web/app/(clinician)` reads `GET /patients/:patientId/intake`. The therapist builds the first plan without the patient's goal, body area, pain numbers or limitations, which is the whole point of the nine steps. Fix: F2.

### 1.2 WP 3.0: accept

M1 to M7 are in and were exercised by this review (lease, own database, drop on exit, cluster stopped only by the lease that started it). No defects found.

### 1.3 WP 3.1: accept with fixes

Sound: one route family, one scoped helper per child resource, M8, `withTx`, pain rule in the check-in transaction, one serializer for preview and patient plan.

1. **Rate limit key is the socket address, and server-rendered reads all arrive from loopback.** `apps/api/src/core/http.ts:32` keys on `request.ip`; `apps/web/lib/api/server.ts:15-19` forwards the cookie only. Every server component read by every user lands in one bucket of 300 per minute, and `phi.read` audit rows for those reads carry the proxy's address hash. This, not the test volume alone, is why the suite hit 429. Fix: F3.
2. `apps/api/src/modules/overview/routes.ts:40-46` lists tasks for the clinician's caseload only. That is the right list for the overview; the contract description and the UI copy say "across the clinic" (see 1.6, item 3). Fix the description in the contract.
3. `GET /patients/:patientId/care-plan/draft` answers 404 when no draft exists. The builder asks on every open, so the browser console shows an error on a normal path (seen four times in the walk). Return 200 with `{ "draft": null }`. A contract change, so it goes with F4.
4. `assignedSessions` counts the week to date (Thursday publish, Monday to Friday schedule: "1 of 1"). The arithmetic is defensible; the contract should say "to date" so the UI can.

### 1.4 WP 3.2a: accept with fixes

Sound: one origin, guards in the layouts, real demo sign-in, style lint with its own test.

1. `apps/web/lib/api/server.ts:15-19`: no `x-forwarded-for` on server-side fetches (F3).
2. `apps/web/app/(public)/login/page.tsx`: no link to `/onboarding`. A new patient cannot find the start of Scenario A. Add "New patient with an eligibility code? Start here." under the form.
3. `apps/web/components/shells.tsx:95`: the staff rail is not sticky; on a long queue the navigation and sign-out scroll away. Make the `aside` `md:sticky md:top-0 md:h-dvh md:self-start` with its own overflow.
4. `apps/web/components/shells.tsx:50`: `PatientShell` is unused since `PatientFrame` replaced it. Delete it.
5. `apps/web/e2e/clinician-helpers.ts:12`: screenshots default to `docs/screenshots/3.3` when `SCREENSHOT_DIR` is unset, so `pnpm verify` rewrites seven committed PNGs and leaves the tree dirty (seen after my run). Screenshots are written only when `SCREENSHOT_DIR` is set. `docs/screenshots/3.3` also holds a copy of the patient screenshots; remove the duplicates.
6. `scripts/e2e.sh:45`, global limit 6000: see ruling 3.5.

### 1.5 WP 3.2b: accept with fixes

Sound: onboarding with autosave and resume, a session player that survives reload, stop flow, the pain notice, charts with tables, consent that is enforced.

1. `apps/web/app/(patient)/_components/plan-change-note.tsx:59`: version 1 is announced as "Your plan changed". Nothing changed; it is the first plan. Version 1 reads "Your plan is ready" with no "Changed:" list.
2. `apps/web/app/(patient)/(app)/progress/page.tsx:165`: the Sessions table is clipped at 390 ("Skipp…") and scrolls sideways. At narrow widths render each session as a stacked row (date and result on one line, counts on the next); keep the table from 640 up.
3. `apps/web/app/(patient)/_components/charts.tsx:37`, `:161`: the SVG scales with its container, so axis text is caption size at 390 and about 26 px at 1440, off the type scale. Give the chart a fixed drawing height and a `max-w` so text stays at caption size, or draw labels in HTML over the plot.
4. `today/page.tsx:127` and `progress/page.tsx:52`: "1 of 1 planned" beside "next schedules exercises on Friday" reads as a contradiction. Say "1 of 1 planned so far this week".
5. The session screen is text only (CR-4). Ruled in section 3.4.
6. At 1440 the patient app is a 632 px column with a bottom tab bar across the full window. Acceptable for a phone-first product; move the two destinations into the header from `md` up when Appointments and Messages arrive in 4.3, not before.

### 1.6 WP 3.3: accept with fixes

Sound: work lists with counts, server-side directory, two-pane record, move buttons, preview through the patient serializer, a queue that says "Rules are thresholds, not predictions".

1. `apps/web/app/(clinician)/patients/[patientId]/tabs.tsx:118`: four equal cards across the record overview. Plan section 4 rules out tile rows. Replace with one summary strip under the patient header (plan and version, week to date, latest check-in, open tasks) as a definition list with links, and give the space to the timeline and the new intake section (F2).
2. `apps/web/app/(clinician)/review-queue/queue.tsx`: every open row carries the same amber "Open" chip, so the chip carries no information, and each task takes four lines (20 tasks is 1,800 px). Make the list a table at 36 px rows: patient, rule, value against threshold, age, assignee. Show status only when it is not `open`. Keep the outlined "Administrative" tag; give clinical rules the filled chip with an icon that plan section 4 asks for. Make the detail pane sticky so a task chosen low in the list does not open off screen.
3. `apps/web/app/(clinician)/overview/overview.tsx:124`: "tasks across the clinic" above a caseload-only list (10 on the overview, 19 in the queue in my walk). Say "for your patients" and label the link "Open the clinic queue (19)" once CR-3 style totals exist.
4. `queue.tsx:220-225`: with filters applied and no match the heading is "Nothing needs attention". That is only true of the unfiltered queue. With any filter set: "No tasks match these filters", then the last-checked line.
5. `tabs.tsx:305`, `:592` and the timeline: status text falls back to the raw enum ("resolved" beside "Completed" and "Reviewed"). Map every status to sentence case; no raw enum reaches the screen.
6. Overview "Visits today" is derived from the directory (CR-1). Until 4.1 lands, title it "Next visits today" so it does not claim to be the calendar.
7. The builder lets "Review and publish version 1" open on an empty plan and then refuses. Keep the button enabled (disabled buttons hide the reason) but have it move focus to the "Add at least one exercise" message without opening the dialog. Confirm that is what `builder.tsx:332` does and cover it in the keyboard spec.

## 2. C1 carry-overs

| Item | Result |
|---|---|
| `initialStatus` in every create path | Confirmed by reading the repositories (section 0). Closed |
| M8 fails on a new unscoped route | Confirmed with my own probe route (section 0). Closed |
| Scoped lookups for child ids | `requireChild` in `apps/api/src/core/scope/patient-scope.ts` is the one path; M8 pass 3 covers it. Closed |
| Appointment and slot consistency | Ruled below for WP 4.1 |

**Appointment and slot ruling (WP 4.1, one migration `phase4_scheduling`).**

- An `Appointment` with a `slotId` must match its slot: same `organizationId` (already a foreign key), same `practitionerId`, and `[startsAt, endsAt)` inside the slot's range. Enforced by a trigger on INSERT and on UPDATE of `slotId`, `practitionerId`, `startsAt`, `endsAt`, raising CP003. One rejection test per condition.
- Booking is one transaction: `SELECT … FOR UPDATE` on the slot, slot `open → booked`, insert the appointment in `initialStatus.Appointment`. The exclusion constraints stay the last line of defence and still map to 409 `booking_conflict`.
- Cancel sets the appointment to `cancelled` and the slot back to `open` in the same transaction. Reschedule is cancel plus book in one transaction with `rescheduledFromId`; if the new booking fails, the old one stays.
- At most one non-cancelled appointment per slot: partial unique index on `slotId WHERE status <> 'cancelled'`.
- `slotId` stays nullable for imported history only. The API never books without a slot.
- The seed's integrity checks gain "every non-cancelled appointment with a slot matches it".

## 3. Rulings

### 3.1 CR-1, appointments on the clinician overview

Accepted, delivered by WP 4.1: `GET /appointments?date=<YYYY-MM-DD>&practitionerId=<id>` returning `AppointmentList` (id, patient reference, start, end, type, status), day computed in the clinic zone. `ClinicianOverview` does not grow; the overview makes the second call. Until then item 1.6.6 applies.

### 3.2 CR-2, care-team membership

Accepted, WP 3.4a. `onCareTeam: boolean` on `ReviewTask` and on the clinical view of `PatientHeader`, computed for the caller. The UI shows the actions it will refuse as unavailable with the reason in text ("Only this patient's care team can resolve this. Care team: …"). The 403 handling stays as the backstop.

### 3.3 CR-3, directory total

Accepted, WP 3.4a. `total: number` on `PatientDirectoryPage` and on `ReviewTaskPage`, from a count with the same `WHERE` and scope, ignoring the cursor. The footer reads "1 to 25 of 312".

### 3.4 CR-4, exercise illustrations

Accepted, with generated assets, on these terms:

- Assets are static files under `apps/web/public/assets/`, served by Next. No API route serves media. `mediaPath` holds the public path; the contract gains `mediaAlt: string | null` on the exercise shape. The seed sets both for covered exercises, so the content hash changes; record the new one.
- Every exercise shows either its own illustration (the twelve used by the demo personas' plans) or the illustration for its body area. Nothing shows an empty box.
- Under every illustration: "Illustration only. Follow the written steps from your care team."
- Timing: generation starts now, as WP 3.5, in the main session where the Magnific tools are (Plus plan, 9,365 credits at the time of this review). It runs beside WP 3.4 and touches only `apps/web/public/assets/**`, `docs/design/art-direction.md` and the manifest. Wiring into the session, plan, onboarding body-area step and three empty states is the last item of WP 3.4b and happens only for assets that passed review. If the set fails review, the session stays text only and CR-4 is closed as "not delivered", in those words.
- The art-direction brief is section 7.

### 3.5 End-to-end rate limits

`RATE_LIMIT_LOGIN_PER_MINUTE=500` in `scripts/e2e.sh`: accepted. The suite signs in about fifty times a minute from one address.

`RATE_LIMIT_GLOBAL_PER_MINUTE=6000`: accepted for the test harness only, and it stays honest only once F3 lands. It is set in the script, never in a default, and `.env.example` keeps 300. After F3, try the suite at the default; if it passes, remove the override; if not, keep it with the measured request count in the comment. Add one API test that the default limit still answers 429 with `Retry-After` for a single session, and one that two sessions behind the proxy are limited separately.

### 3.6 Coordinator and admin shell

Upheld: both use `/admin`. The sign-in cards stop saying "Screens arrive in a later phase" as soon as F1 gives each role a working screen.

## 4. WP 3.4: fixes before Phase 4

Three packages. 3.4a first; 3.4b and 3.4c in parallel, each in its own worktree (section 6).

**WP 3.4a, opus. Owns `scripts/`, `packages/shared`, `packages/db`, `apps/api`.**

| # | Item |
|---|---|
| S1 | Worktree support in the scripts (section 6): shared data root, global web lock, per-worktree `.next` |
| F3 | Rate limit and address: `serverGet` forwards `x-forwarded-for` (the incoming header, else the connection address) and `x-request-id`; the global limiter keys on the session id when a valid session cookie is present and on the client address otherwise; the login and account-creation limits stay per address. Tests as in ruling 3.5 |
| F4 | Contracts: CR-2 `onCareTeam`; CR-3 `total`; draft GET returns `{ draft: null }` instead of 404; `mediaAlt`; overview task list described as caseload; `assignedSessions` described as week to date. `openapi.json` regenerated, M8 fixtures updated |
| F5 | `e2e/clinician-helpers.ts` is not yours; instead make `scripts/e2e.sh` and `verify.sh` fail if `git status --porcelain docs/` is non-empty after the end-to-end stage, so a gate can never dirty the tree again |

Gate: `scripts/gate-wp-3.1.sh` and `pnpm verify`, both in a clean worktree, exit 0; `pnpm openapi:check`.

**WP 3.4b, sonnet. Owns `apps/web/lib`, `apps/web/components`, `apps/web/app/(public)`, `apps/web/app/(patient)`, `apps/web/app/(admin)`, `apps/web/e2e` (shared with 3.4c by file: patient and auth specs here).**

| # | Item |
|---|---|
| F1 | Coordinator and admin screen at `/admin/patients`: the administrative directory (`view: "administrative"`), default filter "Awaiting assignment", a row action "Assign therapist" that opens a dialog listing `/practitioners` with caseload counts and posts the assignment. Patients with incomplete intake show what is missing. No clinical fields. Nav: one item, "Patients". This is the first part of Phase 6 pulled forward; nothing else of Phase 6 comes with it |
| 1.4.2 to 1.4.5 | Onboarding link on sign-in; sticky rail; delete `PatientShell`; screenshots only with `SCREENSHOT_DIR`, duplicates removed |
| 1.5.1 to 1.5.4 | First-plan copy; Sessions table at 390; chart type size; "so far this week" |
| CR-4 wiring | Last. Only assets marked `accepted` in the manifest |

**WP 3.4c, sonnet. Owns `apps/web/app/(clinician)` and the clinician specs.**

| # | Item |
|---|---|
| F2 | Intake on the record: a section on the Overview tab, "What the patient told us at intake", from `GET /patients/:patientId/intake` (goal, body area and side, the three pain numbers labelled patient-reported, limitations, therapist preferences, availability, submitted time). Linked from the builder header ("See intake") in a drawer |
| 1.6.1 to 1.6.7 | Summary strip, queue table and sticky detail, caseload copy, filtered empty state, status text, "Next visits today", empty-plan publish |
| CR-2, CR-3 | Consume `onCareTeam` and `total` once 3.4a has committed them |

**One new end-to-end spec, owned by 3.4b, `e2e/slice.spec.ts`:** the walk from section 0 as a test, with assignment done in the coordinator screen. New patient with a code, coordinator assigns, therapist reads the intake and publishes version 1, patient completes the session and reports pain 8, therapist resolves the single task, the timeline shows four events. It is the regression test for "the slice is real" and runs in `pnpm verify`.

**Gate for WP 3.4 as a whole:** `pnpm verify` exit 0 in a clean worktree of the merged result, tree clean afterwards, output in PROGRESS. Screenshots of the changed screens at 390 and 1440 in `docs/screenshots/3.4/`.

## 5. Scope for Phases 4 to 6

Quality so far is above the bar, and the cost shows where expected: Phase 3 needed five packages and a fix round. The remaining phases keep their core and lose their edges.

### Phase 4, scheduling and messaging: survives, narrowed

| Keeps | Cut or reduced |
|---|---|
| Availability slots, book, cancel, reschedule with the integrity ruling in section 2 | Calendar grid components. Patients pick from a list of open times grouped by day; clinicians get a day agenda list. No week grid, no drag |
| The 50-parallel-bookings test, repeated 20 times | `requested` appointments (C1 ruling 3.3 stands) |
| One reminder job: an in-app notification 24 hours before a visit | Any other reminder cadence |
| Messaging: patient to care team threads, sender name and role, unread counts, failure state, 5 second polling while open, reply-time text, emergency notice in the composer | Attachments, read receipts per message, typing state |
| CR-1 endpoint and the real "Visits today" | |
| Patient tab bar grows to four: Today, Progress, Appointments, Messages | |

### Phase 5, AI, FHIR and Synthea: survives, narrowed

| Keeps | Cut or reduced |
|---|---|
| Provider interface, deterministic provider, evidence verifier, redaction, consent refusal | The patient navigation assistant moves to stretch. It is the weakest claim and the easiest to fake. C3 decides |
| Progress summary and SOAP note draft with evidence links; review, edit, approve, reject; signed notes and amendments | Live provider run stays stretch (C3) |
| The label "Draft, generated, not reviewed" and the provider name on every generated block | |
| Evaluation set: 25 synthetic transcripts with expected facts, each read by opus | Was 50. Twenty-five reviewed cases are worth more than fifty unread ones; the docs say 25 |
| FHIR: mappers and round-trip tests in two batches. Batch 1: Patient, Practitioner, Organization, CarePlan, Goal, Observation. Batch 2: the remaining four in the plan. Bundle export with zero dangling references; import with itemised errors and duplicate detection | Batch 2 is cut at C3 if 5.2 is late, and the docs then say six resources |
| Synthea: `pnpm synthea:demo` and three committed fixture bundles with command and seed (rev1) | Medplum sandbox push stays stretch |

### Phase 6, administration: survives, split

| Keeps | Cut or reduced |
|---|---|
| Assignment screen, pulled into WP 3.4 (F1) | Editable roles (already stretch) |
| Enrollment: eligibility code list with state, create a code | Bulk enrollment, staff-entered patients |
| Review rule settings (the API exists), labelled as arbitrary demo values | |
| Availability editing for a therapist's week, as a list of slots | Recurring availability patterns |
| Metrics as tables computed in SQL, each tested against an independent count | Inline charts on metrics unless 6.2 finishes early |
| Audit viewer with filters; read-only role matrix | |
| Full seed profile, timing gate, `seed:report` | |

Phase 7 to 9 are unchanged and are revisited at C3.

## 6. Parallel work from here

### 6.1 The shared-tree problem

Three times in Phase 3 a worker's `pnpm verify` failed on another worker's uncommitted files. The fix is structural: **nobody works in `/home/claude/carepath` except the orchestrator, and it only merges there.**

- Each work package gets a worktree and a branch: `git worktree add /home/claude/wt/<wp> -b wp/<wp> master`, then `pnpm install --frozen-lockfile --offline` there.
- A worker's gate and `pnpm verify` run in its own worktree, on its own committed state plus its own edits. It can no longer see anyone else's half-finished files.
- The orchestrator merges one branch at a time into `master` (rebase, fast-forward), then runs `pnpm verify` in a fresh worktree of the result. A red merge is reverted, not patched in place.
- A worktree today would start its own cluster on port 54329 from its own `.data`, and two would collide. **S1 (WP 3.4a) fixes this before any parallel work starts:** `scripts/db.sh`, `gate-env.sh`, `with-web-lock.sh` and `e2e.sh` take the data root from `CAREPATH_DATA_ROOT`, defaulting to `.data` beside the main checkout (`git rev-parse --git-common-dir`), so every worktree shares one cluster, one lease directory and one lock. The web lock becomes global on purpose: `.next` is now per worktree, but the machine has 2 CPUs and 7 GB, and two builds plus two browsers at once will fail for reasons that look like bugs. Acceptance: two `pnpm verify` runs started together in two worktrees both exit 0, and the cluster and a held lease survive.
- Until S1 is merged, work is serial.

### 6.2 What may run together

| Wave | Packages | Notes |
|---|---|---|
| 0 | WP 3.4a alone | Scripts and contracts first |
| 1 | WP 3.4b, WP 3.4c, WP 3.5 (assets, main session) | Disjoint directories. 3.4b and 3.4c share `apps/web/e2e` by file name only |
| 2 | WP 4.1 (opus) and WP 4.2 (sonnet) | 4.1 owns `packages/db`, `contracts/scheduling.ts`, `modules/scheduling`. 4.2 owns `contracts/messaging.ts`, `modules/messaging` and no schema: the message tables exist. If 4.2 needs a column, it asks 4.1 |
| 3 | WP 4.3a patient appointments and messages, WP 4.3b clinician agenda and messages | Start when 4.1 and 4.2 are merged |
| 4 | WP 5.1 (opus) and WP 5.4 batch 1 (opus) | `packages/ai` and `packages/fhir` do not touch each other. WP 5.5 (haiku) beside them |
| 5 | WP 5.2, then WP 5.3 and WP 6.1 together, then WP 6.2; WP 6.3 any time after 4.1 | C3 after 5.2 |

Never together: two packages that both change `schema.prisma` or a migration; two packages that both edit the same contract file; anything beside WP 3.4a.

Three files are touched by every API package: `apps/api/src/app.ts` (route registration), `packages/shared/src/contracts/index.ts` and `apps/api/openapi.json`. Rule: each package adds one line to the first two and nothing else; `openapi.json` is regenerated, never merged by hand, by whoever rebases second.

### 6.3 Ports

| Package | API | Web |
|---|---|---|
| `pnpm verify` | 4090 | 3090 |
| 3.4a | 4034 | 3034 |
| 3.4b | 4035 | 3035 |
| 3.4c | 4036 | 3036 |
| 4.1 | 4041 | |
| 4.2 | 4042 | |
| 4.3a, 4.3b | 4043, 4044 | 3043, 3044 |
| 5.x | 4051 to 4055 | 3053 |
| 6.x | 4061 to 4063 | 3062 |
| Advisor reviews | 4095 | 3095 |

Because the build fixes the API port into the rewrite, a worktree's `.next` is only valid for the port it was built with. `pnpm verify` always rebuilds.

### 6.4 Instructions for the next packages

**WP 4.1, opus.** Section 2 ruling and section 3.1. Routes: `GET /practitioners/:practitionerId/slots?from&to&type` (open slots, clinic-zone days), `GET /patients/:patientId/appointments`, `POST /patients/:patientId/appointments` (slotId, type, reason), `POST …/appointments/:appointmentId/cancel` (reason), `POST …/appointments/:appointmentId/reschedule` (slotId), `GET /appointments?date&practitionerId`. Patients book only with a therapist on their care team; coordinators book for anyone in the organization. Every new route with a path id gets M8 fixtures or the gate fails, as designed. `TodayView` gains the next appointment. Reminder job scoped by `job.organizationId`. Gate: the concurrency test (50 parallel, exactly one 201 and 49 times 409 `booking_conflict`, 20 repetitions), the three trigger rejection tests, M8, `openapi:check`, in a clean worktree.

**WP 4.2, sonnet.** Threads are patient to care team. Participant-only access through one scoped helper; coordinators read through `message.org` (C1 ruling 3.7) and that read is audited. Messages are created in `initialStatus.Message`; delivery is a job that marks them sent, and a forced failure leaves a visible `failed` state the sender can retry. Unread counts come from participant read markers, not from the client. `TodayView` and the overview gain unread counts. Gate: tests for unread counts, failure and retry, participant-only access, M8.

**WP 4.3a and 4.3b, sonnet.** No calendar grid and no drag. Booking never re-asks a stored answer: the availability given at intake preselects the day filter. The composer shows the reply-time text and "Not monitored for emergencies. If this is an emergency, call 911." from the shared constant. Every message shows sender name and role. Polling per ADR-12. Gate: Playwright E at 390 and at 1440, a two-browser test where the second booking of one slot gets the plain "That time was just taken" message, axe as before.

**All UI packages, standing rules added by this checkpoint.**

- No raw enum on screen. No chip that is the same on every row.
- Clinician lists are tables at 36 px rows unless a row needs a sentence.
- An empty state says what is true of the current filters.
- A count and the list under it come from the same scope, and the copy names that scope.
- Every gate ends with `git status --porcelain` empty.

## 7. Art direction for generated assets (WP 3.5)

Written before any generation, as brief section 9 requires. Saved by WP 3.5 as `docs/design/art-direction.md` with the accepted style frames.

**Purpose.** Help a patient recognise which exercise or body area a screen is about, and make three quiet moments less bare. Never to teach a movement.

**What is made.**

| Set | Count | Used in |
|---|---|---|
| Body areas, one per value of `bodyAreas` | 10 | Onboarding "Where it bothers you"; fallback beside any exercise without its own picture |
| Exercises in the demo personas' plans | 12 | Session player, session overview, plan, plan builder preview |
| Moments: details with the clinic, done for today, nothing to review | 3 | The two patient empty states and the queue's true empty state |

Not made: photography, portraits of fictional patients or clinicians, marketing imagery, avatars, decorative backgrounds. Photography is where the stock look comes from, and a generated face on a health product invites the reading that a person endorses it. Marketing imagery is reconsidered at C4 with the landing page.

**Style.** Flat editorial illustration, two tones and paper: line and solid fill in forest `#1E4D40`, one warm neutral fill, on the patient background `#F5F2EA` or transparent. Even line weight, rounded joins, generous negative space, one figure per image, simple ground line, no scenery beyond a mat or a chair. No gradients, no glow, no texture, no 3D, no purple. One consistent figure construction across the whole set so it reads as one hand.

**People.** Adults only. Across the set: at least four figures who read as over 60, a range of body sizes, a range of skin tones shown through the neutral fill values, mixed gender presentation, and at least three images with a support (chair, wall, cane nearby). Everyday clothes, not athletic wear. Faces are minimal, calm and not expressive of pain. No real person, no likeness, no named individual, no brand marks.

**Never medically instructive.** No arrows, angle marks, numbers, repetition counts, muscle highlights, anatomical overlays, pain markers, before and after pairs, sequences of steps, or text of any kind inside the image. One neutral mid-movement pose per exercise. If an image could be mistaken for a how-to diagram, it is rejected. The UI caption from ruling 3.4 is mandatory wherever an exercise or body-area image appears, and the exercise notice ("fictional and have not been medically reviewed") stays on the screen.

**Format.** Vector first: try the SVG generator; accept SVG only if the file is under 30 KB and uses only the palette. Otherwise WebP at 960 by 720 (4:3), quality tuned to stay under 45 KB, with a 480 wide variant. Explicit `width` and `height` in markup, `loading="lazy"` except the first exercise image. Decorative moments get `alt=""`; body-area and exercise images get a plain description from the manifest ("A person lying on a mat with knees bent"), never an instruction.

**Process.**

1. Three style frames first (one body area, one floor exercise, one moment). The orchestrator looks at each result with the image-reading tool, not only at the status. Frames go to the advisor before the batch runs.
2. Price the batch with the cost simulation before running it. Ceiling: 1,500 credits for the whole of WP 3.5 including retries. Report credits spent in PROGRESS. Stop and ask at the ceiling.
3. Every image is looked at before acceptance. Reject on: wrong limb count or joints, a pose that is anatomically odd, any text or symbol, a second figure, off-palette colour, a face that reads as a real person, style drift from the frames.
4. Results go to one named Magnific project folder ("CarePath assets"), not loose in the personal space.

**Manifest.** `apps/web/public/assets/asset-manifest.json`, one entry per file: `file`, `set`, `subject` (exercise slug or body area), `usage` (routes), `alt`, `width`, `height`, `bytes`, `format`, `tool` and `model` as reported by the generator, `prompt` (full text), `seed` if reported, `generatedAt`, `reviewedBy`, `status` (`accepted` or `rejected` with the reason), `credits`. A top-level `licensing` block states only what was checked: the plan the assets were generated under, the date the provider's terms were read and their URL, and the sentence "generated imagery; no third-party or stock source". If the terms were not read, the field says "not verified". A script in the WP 7.3 gate fails when a file in `public/assets` has no entry, an entry has no file, an accepted asset is unreferenced in code, or a referenced asset is not `accepted`.

**Honesty.** Docs say "generated illustrations, not medically reviewed". They never say "clinician-approved", "anatomically accurate" or "licensed stock".

## 8. Carried to later checkpoints

- C3: evidence model and labelling; whether the navigation assistant and FHIR batch 2 survive; live provider.
- C4: the queue table, record summary strip and illustrations judged in place; patient layout from `md` up.
- WP 8.2: session-keyed rate limiting and what it does not cover; coordinator access to message bodies; C1 items unchanged.
- Still unverified and to be said so: CI, Compose, Safari, screen readers, Playwright 1.65.1 with Chrome 153 beyond these tests.
