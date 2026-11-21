# CarePath rebuild plan (DESIGN-BRIEF section 17, phases 4 to 9)

Date: 2026-11-20. Author: lead advisor, design checkpoint D1. Decisions cited: `decision-records/DR-001`, `DR-002`, `DR-003`; component decisions `CD-*`.

Aim: every screen is rebuilt once, on the new system. The remaining backend packages are slotted so that no UI is written on the old tokens and then redone.

## 1. Standing rules

1. **Worktrees.** One worktree and branch per package (`/home/claude/wt/<id>`, `wp/<id>`), as checkpoint C2 section 6. Only the orchestrator merges into the main checkout, one branch at a time, then runs `pnpm verify` on the result.
2. **One web lock.** The box has 2 CPUs. Build, `next start` and Playwright run under `scripts/with-web-lock.sh`, so gates queue. Plan for at most **two web-touching packages and one API-or-package-only package** in flight. More than that only lengthens the queue.
3. **`packages/ui` has one owner at a time.** After D-WP-5 merges, screen slices do not edit `packages/ui/**` or `packages/shared/**`. A slice that needs a change writes a request in `docs/PROGRESS.md`; the opus owner batches them (D-WP-U, section 3).
4. **Never together:** two packages that change `schema.prisma` or a migration; two that edit the same contract file; two that edit the same route folder.
5. **Preserve behaviour.** Data models, contracts, auth and business logic stay unless a contract request in section 5 says otherwise. Existing e2e specs keep passing; a spec is edited only where DR-002 changes the behaviour it asserts, and the commit says which ruling.
6. **Honesty rules** of `CLAUDE.md` apply: no participant results, no compliance claims, open sign-offs (DR-002 section 4) are written as open.

## 2. The gate every UI package must pass

A package is done when one command, `scripts/gate-wp-<id>.sh`, exits 0 and its output is pasted into `docs/PROGRESS.md`. For UI packages the gate contains all of the following.

| # | Check | Detail |
|---|---|---|
| G1 | Static | Typecheck, lint (raw colours and arbitrary values still banned), unit tests for owned paths |
| G2 | Token tests | `contrast.test.ts` as rewritten per DR-001 section 8, including "contains no warm neutral" |
| G3 | End-to-end | Existing specs for the routes owned, plus new specs for each DR or CD behaviour the package introduces |
| G4 | axe | Zero serious or critical findings on every owned screen at **375, 768 and 1440** (the baseline ran axe at 1440 only) |
| G5 | Layout matrix | Playwright captures of every owned screen and listed state at **375, 390, 768, 1024, 1440, 1920**; probe reports no horizontal overflow, no computed background with hue 25 to 65 and saturation above 0.10, and no interactive target under 24 px (48 px in the patient theme) |
| G6 | Keyboard | A scripted keyboard-only run of the package's main task; focus never hidden under a sticky bar |
| G7 | Two visual passes | Pass 1: the worker reviews its own captures against the cited CDs and fixes. Pass 2: after fixes, a fresh capture set is reviewed by the advisor (or opus reviewer) against `audit.md` findings for those screens; each finding is marked fixed, changed or still open |
| G8 | Before and after | Pairs written to `docs/design/after/<wp>/` with the same file names as `docs/design/baseline/`, same seed anchor and fixed clock, plus a `pairs.md` listing each pair and the audit finding it addresses |
| G9 | `pnpm verify` | Full run, last |

The baseline capture and probe script is not in the repository (checked: nothing in the tree writes `_probe.json`). D-WP-1 commits it as `apps/web/scripts/design-capture.mjs` and every later gate calls it.

API packages keep the existing gate form: `app.inject()` tests, OpenAPI check, `pnpm verify`.

## 3. Work packages

Owner model: **opus** for the shared foundation and tricky interaction infrastructure, **sonnet** for screen slices and plain API work, **haiku** for mechanical work. "Blocks on" names packages that must be merged first.

### Phase 4: decisions and shared design system

| Id | Package | Owner | Owns (paths) | Changes (decisions) | Blocks on | Gate additions |
|---|---|---|---|---|---|---|
| D-WP-0 | Land the decisions | orchestrator | `docs/**`, `CLAUDE.md`, `docs/decisions/contract-requests.md`, `docs/product/prd.md` | Rebase `wp/design` (it branches from before WP 5.1 and 5.4 were merged) and merge the docs. Add CR-6 to CR-17. Edit REQ-APT-03, AC-E5, AC-E10 and `CLAUDE.md` per DR-002 section 5 | none | Docs only; `pnpm verify` green |
| D-WP-1 | Tokens, type and capture tooling | opus | `packages/ui/src/tokens/**`, `packages/ui/src/styles/**`, `packages/ui/src/fonts.ts`, `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/scripts/design-capture.mjs`, `docs/design-system/README.md` | DR-001 sections 5 to 8: final colour set in both themes, Plex Sans everywhere, serif removed, new type scales, scrim and elevation rebased, `ai-bg`, body background fixed for every role, test rewrite. No layout work | D-WP-0 | G2 in full; `tools/contrast.mjs --strict` exits 0; full capture of all baseline screens as `docs/design/after/D-WP-1/`; probe finds no warm background on any screen. This set is the "tokens only" reference that separates palette change from layout change |
| D-WP-2 | Primitives, feedback, overlays, accessibility infrastructure | opus | `packages/ui/src/components/**` (primitive and composed layers), `packages/ui/src/lib/**` | Buttons and links (CD-420, 421, 426, 429, 530); fields and `FieldError` (CD-531, 108, 110, 441); choice controls, `SegmentedControl`, `ToggleChip`, `SlotButton` (CD-105, 107, 311, 532, 534); `DateOfBirthField` (CD-102); `PainScale` (CD-100, 101); `Tag` and `StatusChip` rules, `CountBadge` (CD-230, 508); `Banner`, one `EmptyState`, skeleton and loading rules (CD-443, 446, 535); toast policy and feedback inside overlays (CD-440, 442, 445, 447, 449, 528); `Dialog`, alert dialog, `Drawer` with the 1280 rule, `BottomSheet` (CD-520 to 525, DR-002 R6); leave guard hook (CD-306, 522); `SkipLink`, focus-on-view-change, scroll-padding tokens, timer and live-region helpers (CD-120 to 127, 507); `Table` with one header row, `TablePagination`, `LoadMore`, `FilterBar` (CD-331, 334, 335, 338 to 340, 342, 343); tabs with URL state (CD-504, 533); `Progress` (CD-214, 536) | D-WP-1 | Unit test per component for states and keyboard; axe on every gallery specimen; reduced-motion and 200 percent zoom captures of the gallery; no component left in two versions (the duplicates named in `component-usage-matrix.md` are removed) |
| D-WP-3 | Shared vocabulary and formatters | sonnet | `packages/shared/src/labels/**`, `packages/shared/src/copy.ts`, `packages/shared/src/format/**` | Exhaustive status maps (CD-231 to 240, with DR-002 amendments); `URGENT_NOTICE`, pain anchor constants, the "Demo default" label (DR-002 R3, R5); `formatVisitTime` (CD-314); dose formatter (CD-301); `ObservationValue` text (CD-220); action label table (CD-428); microcopy fixes from `microcopy-guidelines.md` section 6 | D-WP-0 | Enum exhaustiveness tests; banned-word test over every new string; daylight-saving and other-zone cases for `formatVisitTime`. Runs beside D-WP-2 (different package). Adds no contract; touches no file under `contracts/` |
| D-WP-4 | Storybook | sonnet (setup), haiku (stories) | `packages/ui/.storybook/**`, `packages/ui/src/**/*.stories.tsx`, `packages/ui/package.json` | Section 6 of this plan. Stories for every component from D-WP-2 and D-WP-5 with states, realistic synthetic content, the accessibility addon and the 375 and 1440 viewports | D-WP-2 (stories for the kit follow D-WP-5) | `storybook build` exits 0; Playwright opens the static build and runs axe on every story; story count equals exported component count. Dependency commit is its own commit |
| D-WP-5 | Healthcare components kit | opus | `packages/ui/src/components/healthcare/**` | `PatientBanner` (CD-200 to 203); patient row identity (CD-204); charts, day strip, chart figure with equal table, missing and stale states (CD-210 to 218); `ExerciseSummary`, `DoseEditorRow`, move buttons, `VersionList`, `PlanDiff`, `PlanStateLine` (CD-300 to 305); `AppointmentRecord` (CD-317); `MessageThread`, composer, delivery state, `EmergencyNotice` (CD-510 to 513); `EvidenceRef`, `AIDraftBlock` six states, provenance line, `ReviewDecisionBar` shell (CD-236, 404 to 407); consent status line (CD-140, 146) | D-WP-2, D-WP-3 | Each component rendered with long names, missing data and error content; chart tables carry the same values as the marks (test); no business logic or fetch inside the package |
| D-WP-6 | Shells, navigation, sign-in | opus | `apps/web/app/(patient)/layout.tsx`, `(patient)/_components/patient-frame.tsx`, `apps/web/app/(clinician)/layout.tsx`, `(clinician)/_components/` shell files, `apps/web/app/(admin)/**/layout.tsx`, `apps/web/app/(public)/login/**`, `(public)/page.tsx` | Patient bottom bar and header row (CD-500, 205); staff sidebar from 768 and labelled bottom bar below, order per DR-002 H, both inbox badges (CD-501, 506, 508); admin shell without a one-item sidebar (CD-502); landmarks and one skip link (CD-507); back links (CD-505); demo banner on the new surface; sign-in with the demo chooser demoted; the staff-layout search store for DR-002 I | D-WP-2 | The three overflow failures in `audit.md` section 4 that come from the shell are gone at 375, 390 and 768; the staff nav no longer takes the first 280 px at 390; badge equals the API total |
| D-WP-7 | Illustrations | main session (image work), haiku (manifest and wiring) | `apps/web/public/assets/illustrations/**`, `docs/design-system/asset-manifest.json`, `apps/web/components/illustration.tsx`, `packages/db/seed/data/exercise-media.ts` | Section 7 of this plan: 19 files re-exported with true alpha and recoloured per `design-tokens.md` section 7; six new exercise pictures; container changed to a `surface-sunken` tile without border | D-WP-1 | The pixel check in `design-tokens.md` section 7 passes for every file on white, canvas and sunken; manifest updated; caption "Illustration only" still present wherever a picture shows |
| D-WP-U | UI change requests | opus | `packages/ui/**`, `packages/shared/src/{labels,format}/**` | Batches of requests from the slices (rule 3). Runs between waves, never beside another `packages/ui` writer | as needed | D-WP-2 and D-WP-5 gates re-run |

**Checkpoint D2** follows D-WP-1, 2, 5 and 6: the advisor reviews the full recapture before any screen slice starts. No slice begins on a foundation that has not been looked at.

### Phase 5: patient workflows

| Id | Package | Owner | Owns (paths) | Changes (decisions) | Blocks on | Gate additions |
|---|---|---|---|---|---|---|
| D-WP-8 | Onboarding and consent | sonnet | `apps/web/app/(patient)/onboarding/**`, `(patient)/(app)/consent/**` | DR-002 A; CD-102, 105 to 109, 140 to 145, 441 | D2 | All 11 steps and the resume summary captured; error summary state; reload on the account step warns and stores nothing (test reads `sessionStorage` and `localStorage`). Added by C3 5: remove the "Camera movement tracking, not available yet" block from onboarding and from Sharing and consent (`(patient)/_lib/consent-copy.ts:34`, the `motion_tracking` entry), because a promise about a cut feature is a dead item under R7; the `motion_tracking` enum value stays and stays ungrantable |
| D-WP-9 | Today, plan, progress | sonnet | `(patient)/(app)/today/**`, `plan/**`, `progress/**`, `(patient)/_components/charts.tsx` (removed in favour of the kit) | DR-002 B and E; CD-210 to 219, 300, 304, 416 | D2 | Exactly one primary button on Today in each of the five session states (test); no string matching "min" beside the session, "improv" anywhere (AC-C7); charts fill their container at 1440; chart and table values equal |
| D-WP-10 | Session player and pain reporting | opus | `(patient)/(session)/**`, `(patient)/(app)/check-in/**` | DR-002 C and D; CD-100, 101, 124 to 126, 421, 424, 525 | D2. CR-6 does not block | Primary action visible without scrolling at 375 by 667 and 390 by 844 in every phase; Stop reachable in every phase; pause, resume and stop paths in e2e; after a stop the check-in shows the earlier number with its sentence; reduced-motion run; the pain scale wraps as 0 to 5 and 6 to 10. When CR-6 lands, a follow-up commit makes Stop immediate |
| D-WP-11 | Patient scheduling | sonnet | `(patient)/(app)/appointments/**` | DR-002 F; CD-103, 310, 311, 314 to 318, 448 | D2 | Conflict recovery e2e; video visit seen from another zone shows both times; no success state before the server answers; the calendar file contains no type or reason (test parses it) |
| D-WP-12 | Messaging, patient and staff | sonnet | `(patient)/(app)/messages/**`, `(clinician)/inbox/**` | DR-002 G; CD-510 to 515, 238 | D2 | Patient composer contains both constants verbatim; staff composer contains neither; draft survives in-app navigation and is absent from browser storage; failed-send and retry e2e; on-screen keyboard capture at 390 |

**Checkpoint D3** after the patient slices: advisor review of the patient before-and-after set.

### Phase 6: clinician workflows

| Id | Package | Owner | Owns (paths) | Changes (decisions) | Blocks on | Gate additions |
|---|---|---|---|---|---|---|
| D-WP-P | Prototype: longitudinal history | sonnet | `apps/web/app/(public)/design-system/prototypes/longitudinal-history/**` | DR-003 section 3; closes CD-241 | D-WP-5 | Four captures plus the table fallback; advisor walkthrough recorded in CD-241; the folder is deleted in D-WP-15 |
| D-WP-13 | Directory and review queue | sonnet | `(clinician)/patients/page.tsx`, `directory.tsx`, `(clinician)/review-queue/**` | DR-002 I and L; CD-204, 230, 234, 330 to 343 (peek removed), 430, 523 | D2 | **No URL containing `q=` after any staff navigation** (test walks search, sort, page, open record, back); "Back to results" restores filters, sort, page and search text; stacked list below 768; queue note typed text survives an API failure, a stray click and Esc |
| D-WP-14 | Overview and schedule | sonnet | `(clinician)/overview/**`, `(clinician)/schedule/**` | DR-002 H; CD-312, 319, 233, 524, 526 | D-WP-13 (reuses its task detail) | Each group count equals its list length (REQ-OVR-01); pane in place at 1280 and 1440, drawer at 1024, full screen at 390; schedule overflow from `audit.md` gone at 375, 390, 768 |
| D-WP-15 | Patient record | sonnet | `(clinician)/patients/[patientId]/page.tsx`, `record.tsx`, `tabs.tsx`, `appointments-tab.tsx` | DR-002 J; CD-200 to 203, 216, 217, 220, 241 as decided, 413, 503, 504 | D-WP-13, D-WP-P | Banner present on the record and builder, absent on lists; banner not covered by focus at 400 percent zoom; two same-surname patients distinguishable; document title holds no name; appointments tab overflow gone |
| D-WP-16 | Care-plan builder | sonnet | `(clinician)/patients/[patientId]/plan/**` | DR-002 K; CD-300 to 306, 122, 232, 416, 424 | D-WP-15 | Keyboard-only reorder with focus kept; state line shows what the patient sees at every width; stale-draft and failed-save recovery e2e; four exercises fit in far less than the 1,100 px the audit measured (report the new figure, no target claimed); fix the flaky `slice.spec.ts:188` heading match noted in WP 5.1 |

### Backend packages, slotted

| Id | Package | Owner | Owns | Notes | Blocks on |
|---|---|---|---|---|---|
| WP 5.2 | AI and notes endpoints (in progress) | opus | `apps/api/src/modules/ai`, AI and note contracts | Must take CR-7, CR-8 and CR-16 before it closes, or 5.3 is built against a contract that will change. Checkpoint C3 follows it, as planned | in progress |
| WP 5.4b | FHIR batch 2 | opus | `packages/fhir/**`, `modules/fhir` | No UI. Safe beside anything that does not change the schema. Still cut at C3 if 5.2 runs late | none |
| WP B-CR | Contract batch | sonnet | `modules/sessions`, `modules/review`, `modules/patients`, `modules/scheduling`, their contract files | CR-6, CR-9, CR-10, CR-11, CR-12, CR-17. One package so the schema and `openapi.json` change once | after 5.2 (schema lock) |
| WP 6.1 | Admin API | sonnet | `apps/api/src/modules/admin`, admin contracts | Metrics (CR-13), availability writes (CR-14), audit query (CR-15), eligibility codes, review-rule settings | after B-CR (schema lock) |
| WP 5.3 | AI review and notes UI | sonnet | `(clinician)/patients/[patientId]/notes/**`, `summaries/**`, the Overview "AI drafts" group | Built once, on the new system, per DR-002 M and CD-400 to 416. First gate includes the DR-003 render check | 5.2, C3, D-WP-15 |
| WP 6.2 | Admin UI | sonnet | `apps/web/app/(admin)/**` except the layout | Per DR-002 N; also restyles the existing `/admin/patients` (CD-204, 231, 339) so one owner holds the folder | 6.1, D-WP-6, D-WP-13 |
| WP 6.3 | Full seed profile | haiku | `packages/db/seed/**` | Separate profile; the demo seed and its anchor do not change, so before-and-after pairs stay comparable. Added by C3 4.4: the seed NPIs in `packages/db/seed/people.ts` get a computed check digit by the same rule as `isValidNpi` (prefix 80840), keeping the leading 9 that marks them as fictitious; new integrity check "every seeded NPI passes `isValidNpi`"; record the new content hash | none (not beside a schema change) |

### Phases 7 to 9

Phase 7 (administrative experience) is WP 6.1 and WP 6.2 above.

| Id | Package | Owner | Owns | Content | Blocks on | Gate |
|---|---|---|---|---|---|---|
| D-WP-18 | Responsive, accessibility and interaction test pass | opus (review), haiku (captures) | `apps/web/e2e/**` additions, `docs/design/accessibility-audit.md`, `docs/design/usability-testing.md`, `docs/design/after/final/**` | Full matrix of every screen and state at six widths; axe at all six; scripted keyboard runs per role; 200 and 400 percent zoom; reduced motion; forced colours; Plex Mono 0 and O check (DR-001 section 6). `usability-testing.md` records heuristic walkthroughs and says plainly that no participants took part | all slices, 5.3, 6.2 | Every `audit.md` finding has a status; zero open serious findings; any finding left open is listed with its reason |
| D-WP-19 | Polish and documentation | opus (review and writing), haiku (index filling) | `docs/design/**`, removal of `(public)/design-system` once Storybook has parity | Two whole-product refinement passes for consistency across roles; remove the accent teal if nothing uses it (DR-001 section 10); fill the Implemented, Storybook and Tests columns of `component-research/INDEX.md`; write `final-design-rationale.md` with the open sign-offs, `component-guidelines.md`, the limitations list and the case study | D-WP-18 | Every INDEX row has a component path, a story and a test, or a stated reason; `pnpm verify` green |

**Checkpoint D4** closes the work.

## 4. Order and what runs together

| Wave | Web lock users (max two) | Beside them, no web lock contention | Then |
|---|---|---|---|
| 0 | D-WP-0 | WP 5.2 continues; WP 5.4b; WP 6.3 | |
| 1 | D-WP-1 alone | WP 5.2; D-WP-3 | |
| 2 | D-WP-2 | D-WP-3 finishes; D-WP-7 image work | |
| 3 | D-WP-5, D-WP-6 | D-WP-4 setup; WP B-CR once 5.2 has merged | **D2**; C3 when 5.2 is done |
| 4 | D-WP-8 with D-WP-10, then D-WP-9 with D-WP-11, then D-WP-12 with D-WP-P | WP 6.1; D-WP-4 stories | D-WP-U; **D3** |
| 5 | D-WP-13, then D-WP-14 with D-WP-15, then D-WP-16 | | D-WP-U |
| 6 | WP 5.3 with WP 6.2 | | |
| 7 | D-WP-18 | | |
| 8 | D-WP-19 | | **D4** |

Why this is safe: the pairs in waves 4 to 6 own different route folders and none of them writes `packages/ui` or `packages/shared`. D-WP-12 is the only package that owns folders in two route groups, and nothing else touches either. D-WP-5 and D-WP-6 run together because one owns `packages/ui` and the other owns `apps/web` layouts. API packages are serial with each other wherever the schema changes: 5.2, then B-CR, then 6.1.

Ports: D-WP-n uses API 41nn and web 31nn (D-WP-8 is 4108 and 3108); `pnpm verify` keeps 4090 and 3090.

## 5. Contract requests

To be added to `docs/decisions/contract-requests.md` by the orchestrator. "Blocks" means a UI package cannot pass its gate without it.

| CR | Request | From | Lands in | Blocks |
|---|---|---|---|---|
| CR-6 | `discomfortLevel` nullable on `SessionStopRequest`, so Stop ends the session at once and the rating follows | C, D (was CR-C1) | B-CR | No. D-WP-10 ships the current order and switches in a follow-up |
| CR-7 | `AIReview` payload stores statement resolutions (removed, edited, kept with note), missing-information acknowledgement and evidence-open references; an unreviewed draft cannot be approved after AI consent is withdrawn (409 with a reason) | M, `06`, DR-002 S6c | WP 5.2 | **Yes, WP 5.3** |
| CR-8 | Notes: an amendment is created and signed in one call with a required reason, author only; signing refuses a note with all four sections empty; `entered_in_error` endpoint with required reason, author or clinic administrator, irreversible | `07`, DR-002 M | WP 5.2 | **Yes, WP 5.3 notes** |
| CR-9 | `ReviewTask.priorityLevel: "high" \| "standard"`, derived on the server | CD-235 | B-CR | No. Tag absent until then |
| CR-10 | Per-rule totals on `GET /review-tasks` | L | B-CR | No. Chips absent until then |
| CR-11 | Review task event history (created, assigned, unassigned, reviewed, closed) | L | B-CR | No. History shows created and resolution |
| CR-12 | `POST /patients/search` with the term in the body | DR-002 I | B-CR | No. The browser-URL fix in D-WP-13 is UI-only and is the blocking part |
| CR-13 | Metrics endpoint: per metric the numerator, denominator, window, `computedAt`, previous-window value where computable, and a drill-down whose row count equals the number; filters for "onboarding not submitted", "active without a published plan", cancelled appointments, review tasks by age band | N | WP 6.1 | **Yes, WP 6.2** |
| CR-14 | Availability writes: add times for a therapist and day, block a time, remove an open time (409 when booked); clinician agenda returns open times including earlier today | N, CD-312, CD-313 | WP 6.1 | **Yes, WP 6.2 availability.** The agenda part does not block D-WP-14 |
| CR-15 | Audit query with filters and cursor paging | N, CD-413 | WP 6.1 | **Yes, WP 6.2 audit viewer** |
| CR-16 | Overview: "AI drafts awaiting review" list with count | H, REQ-OVR-01 | WP 5.2 | No. The group appears when the field does |
| CR-17 | Idempotency key on the booking request | `10` | B-CR | No |

Rejected, with the reason in DR-002: eligibility pre-check, email confirmation, per-set storage, check-in body area and timing, "none" versus "skipped" on limitations, `estimatedMinutes`, saved personal views, plan templates and archive, pre-filled message subject.

## 6. Storybook: yes

`COMPONENT-BRIEF.md` section 24 asks for Storybook by name and section 25 asks for a "Storybook examples" column in the index. The earlier plan made it stretch and used the `/design-system` gallery because Playwright could capture it. That reason no longer holds: a static Storybook build is a folder of pages Playwright can open and scan just as well, and the shared library is about to grow from 20 components to roughly three times that, which a hand-written gallery page does not carry.

- **Scope:** `packages/ui` only. No stories for app screens.
- **Dependencies approved (advisor, per `CLAUDE.md`), dev only, exact pins, own commit:** `storybook`, `@storybook/react-vite`, `@storybook/addon-a11y`, and `vite` plus `@vitejs/plugin-react` if the workspace does not already resolve them. Use the current stable major at install time and record the versions in `docs/PROGRESS.md`. Not approved: the Storybook test runner, Chromatic, any hosted service.
- **Checks** run through the existing Playwright and axe setup against `storybook build` output, under the web lock.
- **Gallery:** `/design-system` stays until stories reach parity, then D-WP-19 removes it, so there is one catalogue. The prototype route lives under it only until CD-241 closes.
- **If the install cannot be done** (the build box installs offline and egress has been unreliable): keep the gallery, extend it to the new components, mark the Storybook column "not available: install blocked" and list it as a limitation. No slice waits on Storybook.

## 7. Illustrations

**Recolour: do it, without generation credits.** DR-001 section 9 requires true alpha and no baked paper. The 18 opaque files are re-exported with the background removed and the line and fill colours remapped to the rule in `design-tokens.md` section 7. Each result is looked at, not only pixel-checked. A file that fails the check after one retry is regenerated and counted against the ceiling below.

**The six missing exercise pictures: generate them now.** Checkpoint C2 planned twelve exercise pictures, one for each exercise in the demo personas' plans; six exist and the rest fall back to a body-area picture. In the new player one exercise fills the screen, so two different exercises in the same plan showing the same body-area picture reads as a mistake. Generating them now also means they are made once, in the new palette and with alpha, instead of made in the old style and recoloured.

- Order: recolour first; when the 19 pass, generate the six to match them.
- Ceiling: 600 credits including retries, priced with the cost simulation before the batch. Stop and report at the ceiling.
- Art direction is unchanged: neutral pictures, no arrows, no step sequences, no counts; caption "Illustration only. Follow the written steps from your care team."; manifest entry per file; "generated, not medically reviewed".
- No other new imagery. No photography in clinical workspaces.

## 8. Risks

| Risk | Handling |
|---|---|
| The phase-driven player (D-WP-10) does not verify at phone sizes | Fallback C1 is named in DR-002 and shares the same components |
| WP 5.2 closes without CR-7 and CR-8 | WP 5.3 does not start; this is a C3 agenda item |
| The web lock queue makes waves 4 to 6 slow | Slices are sized to one route folder each; package gates run only owned paths and `pnpm verify` runs once at the end |
| Token change breaks pinned colours in e2e or screenshots | D-WP-1 owns finding and fixing them and runs alone |
| A slice quietly forks a shared component | Rule 3, and the D-WP-19 gate requires one implementation per INDEX row |
| Plex Sans reads too technical for patients (DR-001 untested assumption) | Looked at in D2 on Today and the player at 390; a change is a token edit |

## 9. Checkpoint C3 addendum

Dated 2026-11-20. Source: `docs/decisions/checkpoint-c3.md`, which wins where it differs from this plan.

- **Stretch tier.** Cut: Medplum sandbox push, patient navigation assistant, motion tracking (Phase 9), saved filters, editable roles, row-level security, audit hash chain, PWA polish beyond manifest and app-shell worker, landing page art. Held: live Anthropic run, as an evaluation-only run once the user supplies a key (never in the app). Storybook stays released (section 6).
- **D-WP-8.** Remove the camera movement tracking block from onboarding and from Sharing and consent (`(patient)/_lib/consent-copy.ts:34`). The `motion_tracking` enum value stays and stays ungrantable.
- **WP 6.3.** Fix the seed NPIs (`packages/db/seed/people.ts:243`): compute the check digit with the rule `isValidNpi` uses (prefix 80840), keep the leading 9, add the integrity check "every seeded NPI passes `isValidNpi`", and record the new content hash. The mapper keeps omitting an NPI that fails the check; `fhir-validation.md` then reports the seeded export with NPIs present.
- **Fix packages.** WP 5.6a (`packages/ai`, evaluation report) starts now. WP 5.6b (notes, AI and FHIR modules, one migration, labels) starts after WP B-CR merges and finishes before WP 6.1 and WP 5.3. Order of schema changes: 5.2, B-CR, 5.6b, 6.1. CR-18 and CR-19 are delivered by 5.6b.
- **WP 5.3 added conditions.** The label strings from DR-002 M (as amended); no supported mark on an edited statement; "opened", never "checked"; no pending state; autosave posts a version on leaving the editor, on explicit save, or after 30 seconds without typing.
