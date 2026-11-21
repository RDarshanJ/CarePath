# Contract requests

UI workers (WP 3.2, 3.3 and later) never edit `packages/shared/src/contracts` or the API. When a screen needs a field, an endpoint, an error code or a new primitive in `packages/ui` that does not exist, append a request here and keep building other parts of the screen. Do not reshape responses on the client to work around a missing field, and do not merge a screen with placeholder data (checkpoint C1, sections 3.5 and 5.7).

The contract owner (the API worker) answers each request in the same entry and links the commit. Route names and contract names are in `docs/architecture/api-phase3.md`.

## How to write a request

Copy this block to the end of the file and fill every line.

```
### CR-<next number>: <short title>

- Requested by: <work package>, <date>
- Screen or test: <route group and page, or Playwright scenario>
- Endpoint and contract: <method path, contract name>
- What is missing: <field, endpoint, error code or primitive, with its type>
- Why: <acceptance criterion or requirement id>
- Status: open
- Answer: <filled in by the contract owner: accepted with commit, or declined with reason>
```

## Requests

### CR-1: Appointments on the clinician overview

- Requested by: WP 3.3, 2026-11-20
- Screen or test: `(clinician)/overview`, "Visits today"
- Endpoint and contract: `GET /overview`, `ClinicianOverview`; or `GET /appointments?date=<YYYY-MM-DD>&practitionerId=<id>`
- What is missing: a list of the signed-in clinician's appointments for the organization's current day (id, patient, start and end instants, visit type, status), with a count equal to the list length (REQ-OVR-01). The contract says appointment lists arrive in Phase 4.
- Why: the overview brief asks for today's appointments. Until Phase 4, the overview derives "Visits today" from the patient directory (`GET /patients?clinicianId=<me>&hasUpcomingAppointment=true`, `nextAppointmentAt` on today's date in the clinic zone). That shows only each patient's next visit, so a second visit for the same patient on the same day, a cancelled visit and the visit type are not visible.
- Status: open
- Answer: accepted at checkpoint C2 (ruling 3.1), delivered by WP 4.1 as `GET /appointments?date&practitionerId` returning `AppointmentList`. Until then the overview titles the section "Next visits today".

### CR-2: Care-team membership on review tasks and the patient header

- Requested by: WP 3.3, 2026-11-20
- Screen or test: `(clinician)/review-queue`, patient record header and plan builder
- Endpoint and contract: `ReviewTask`, `PatientHeader` (or `CareTeamCard`)
- What is missing: a boolean `onCareTeam` for the signed-in clinician. `GET /review-tasks` lists every task in the clinic, but assign, resolve, dismiss and plan saves answer 403 `not_on_care_team` for a patient outside the clinician's care teams.
- Why: AC-B6, AC-D5. Without the flag the UI offers actions that it already knows will be refused and explains the refusal only afterwards. The UI handles the 403 with a plain message today.
- Status: done
- Answer: accepted at checkpoint C2 (ruling 3.2), delivered by WP 3.4a (commit "contracts: onCareTeam, totals, draft null, mediaAlt"). `ReviewTask.onCareTeam: boolean` on every task response (queue, per-patient list, overview, assign, resolve, dismiss) and `PatientHeader.onCareTeam: boolean | null` (null for the patient and for roles without clinical.read), both computed for the signed-in user. The 403 `not_on_care_team` stays as the backstop.

### CR-3: Total count on the patient directory

- Requested by: WP 3.3, 2026-11-20
- Screen or test: `(clinician)/patients`
- Endpoint and contract: `GET /patients`, `PatientDirectoryPage`
- What is missing: `total: number`, the count of rows matching the query ignoring the cursor.
- Why: REQ-DIR-01 and interaction principle 11 ask for a visible count. Cursor pages cannot say "21 to 40 of 312", so the footer says "Page 2, 25 patients shown, more on the next page". Not a blocker.
- Status: done
- Answer: accepted at checkpoint C2 (ruling 3.3), delivered by WP 3.4a (same commit). `total: number` on `PatientDirectoryPage` and `ReviewTaskPage` (queue and per-patient list), from a count with the same WHERE and scope as the page, cursor ignored.

### CR-4: Exercise illustrations for the patient session

- Requested by: WP 3.2b, 2026-11-20
- Screen or test: `(patient)/session/[sessionId]`, `(patient)/plan`
- Endpoint and contract: `ExerciseSessionDetail.activities[].exercise.mediaPath`
- What is missing: `mediaPath` is null for every seeded exercise and there is no route that serves exercise images or video.
- Why: REQ-SES asks for a picture or short clip beside the written steps. The session shows the written steps only, with no empty image box. Not a blocker.
- Status: done
- Answer: accepted at checkpoint C2 (ruling 3.4). Contract part delivered by WP 3.4a: `mediaAlt: string | null` beside `mediaPath` on every exercise shape (`Exercise`, plan items, session activities) and an `Exercise.mediaAlt` column with a check that path and description are set together. Both stay null in the seed until WP 3.5 assets pass review and WP 3.4b wires them; no API route serves media.
  Delivered by WP 3.4b: 19 accepted illustrations wired into the patient session, session overview, care plan and onboarding, with the mandatory caption; the seed sets both fields for every exercise (own picture or body-area picture). The clinician plan builder preview and the queue empty state are not wired yet.

### CR-5: Evaluation case format for `pnpm ai:eval`

- Requested by: WP 5.1 (contract owner) for WP 5.5, 2026-11-20
- Screen or test: `pnpm ai:eval`, `docs/evaluation/ai-eval.md`
- Endpoint and contract: `packages/ai/evals/schema.ts`, `EvalCase` (schema version 1); rules and an example in `packages/ai/evals/README.md`
- What is missing: nothing; this entry records the agreed format. Files are `packages/ai/evals/data/case-01.json` to `case-25.json`, one synthetic encounter each. `pnpm --filter @carepath/ai exec tsx evals/check.ts <files>` validates them. A case that fails the schema is reported as invalid by the eval and excluded from every rate.
- Why: checkpoint C2 Phase 5 (25 reviewed transcripts with expected facts); PRD section 11 (evaluation).
- Status: done
- Answer: defined by WP 5.1 in the commit "ai: eval case schema (EvalCase v1), README, checker, two fixture cases". Changes to the format go through a new entry here.

### CR-6: Stop without a pain rating

- Requested by: D-WP-10 (decisions C, D; was CR-C1), 2026-11-20
- Screen or test: `(patient)/(session)/**`
- Endpoint and contract: `SessionStopRequest`
- What is missing: `discomfortLevel` nullable, so Stop ends the session at once and the rating follows.
- Why: DR-002 C, D; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): B-CR
- Blocking: No. D-WP-10 ships the current order and switches in a follow-up commit.
- Status: open
- Answer: pending

### CR-7: AI review payload: resolutions, acknowledgement, evidence opens

- Requested by: D-WP-0 (DR-002 M, S6c; `06`), 2026-11-20
- Screen or test: clinician AI review panel
- Endpoint and contract: `AIReview` payload
- What is missing: Statement resolutions (removed, edited, kept with note), missing-information acknowledgement and evidence-open references; an unreviewed draft cannot be approved after AI consent is withdrawn (409 with a reason).
- Why: DR-002 M, S6c; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): WP 5.2
- Blocking: Yes, WP 5.3.
- Status: delivered (WP 5.2, branch `wp/5.2`)
- Answer: the review state is stored in `AIReview.editedOutput` (`carepath.ai.review-state.v1`): per-statement resolution (`edited` with text, `removed`, `acknowledged` with a note), `acknowledgedMissing`, and `evidenceOpened` entries ({statementId, type, id, at}) recorded by `POST /patients/:patientId/ai/generations/:generationId/evidence-opens`. `AiGeneration` exposes `statements[].resolution`, `note`, `evidenceOpened`, `missingInformation[].acknowledged`, `revisions[].kind` and `approval.blockers` (`unsupported_unresolved`, `missing_unacknowledged`, `evidence_not_opened`, `empty_output`, `consent_withdrawn`). Approval after consent withdrawal answers 409 `ai_consent_withdrawn` with an `ai.refused` event; rejecting stays available. Demo rules pending clinical governance review.

### CR-8: Notes: amendment, completeness and entered in error

- Requested by: D-WP-0 (DR-002 M; `07`), 2026-11-20
- Screen or test: clinician notes
- Endpoint and contract: note sign, amend and entered-in-error endpoints
- What is missing: An amendment is created and signed in one call with a required reason, author only; signing refuses a note with all four sections empty; an `entered_in_error` endpoint with required reason, author or clinic administrator, irreversible.
- Why: DR-002 M, S4, S5; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): WP 5.2
- Blocking: Yes, WP 5.3 notes.
- Status: delivered (WP 5.2, branch `wp/5.2`)
- Answer: `POST /patients/:patientId/notes/:noteId/amendments` (author only, `reason` required, creates and signs the amendment in one call; `note.sign` event with detail `amendment`); `POST .../versions` now takes working versions on drafts only; `POST .../sign` answers 409 `note_empty` when all four sections are blank; `POST .../entered-in-error` (author or clinic administrator, `reason` required, signed notes only, irreversible by trigger; `note.entered_in_error` event). `ClinicalNote` carries `enteredInError {at, by, reason}`, `canSign`, `canAmend`, `canMarkEnteredInError`. Excluding entered-in-error notes from FHIR export belongs to the DocumentReference mapper (WP 5.4 batch 2): export only `status = signed`. Demo rules pending clinical governance review.

### CR-9: Review task priority level

- Requested by: D-WP-0 (CD-235), 2026-11-20
- Screen or test: clinician review queue
- Endpoint and contract: `ReviewTask`
- What is missing: `priorityLevel: "high" | "standard"`, derived on the server.
- Why: CD-235; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): B-CR
- Blocking: No. Tag absent until then.
- Status: open
- Answer: pending

### CR-10: Per-rule totals on review tasks

- Requested by: D-WP-0 (DR-002 L), 2026-11-20
- Screen or test: clinician review queue
- Endpoint and contract: `GET /review-tasks`
- What is missing: Per-rule totals.
- Why: DR-002 L; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): B-CR
- Blocking: No. Chips absent until then.
- Status: open
- Answer: pending

### CR-11: Review task event history

- Requested by: D-WP-0 (DR-002 L), 2026-11-20
- Screen or test: clinician review queue
- Endpoint and contract: review task detail
- What is missing: Event history: created, assigned, unassigned, reviewed, closed.
- Why: DR-002 L; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): B-CR
- Blocking: No. History shows created and resolution.
- Status: open
- Answer: pending

### CR-12: Patient search with the term in the body

- Requested by: D-WP-0 (DR-002 I), 2026-11-20
- Screen or test: `(clinician)/patients`
- Endpoint and contract: `POST /patients/search`
- What is missing: The search term in the request body so it never appears in a URL (R2).
- Why: DR-002 I, CD-333; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): B-CR
- Blocking: No. The browser-URL fix in D-WP-13 is UI-only and is the blocking part.
- Status: open
- Answer: pending

### CR-13: Metrics endpoint with definitions and drill-down

- Requested by: D-WP-0 (DR-002 N), 2026-11-20
- Screen or test: `(admin)` metrics
- Endpoint and contract: metrics endpoint
- What is missing: Per metric: numerator, denominator, window, `computedAt`, previous-window value where computable, and a drill-down whose row count equals the number; filters for onboarding not submitted, active without a published plan, cancelled appointments, review tasks by age band.
- Why: DR-002 N; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): WP 6.1
- Blocking: Yes, WP 6.2.
- Status: open
- Answer: pending

### CR-14: Availability writes and agenda open times

- Requested by: D-WP-0 (DR-002 N; CD-312, CD-313), 2026-11-20
- Screen or test: `(admin)` availability, clinician agenda
- Endpoint and contract: availability endpoints
- What is missing: Add times for a therapist and day, block a time, remove an open time (409 when booked); the clinician agenda returns open times including earlier today.
- Why: DR-002 N, CD-312, CD-313; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): WP 6.1
- Blocking: Yes, WP 6.2 availability. The agenda part does not block D-WP-14.
- Status: open
- Answer: pending

### CR-15: Audit query with filters and cursor paging

- Requested by: D-WP-0 (DR-002 N; CD-413), 2026-11-20
- Screen or test: `(admin)` audit log
- Endpoint and contract: audit query endpoint
- What is missing: Filters and cursor paging.
- Why: DR-002 N, CD-413; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): WP 6.1
- Blocking: Yes, WP 6.2 audit viewer.
- Status: open
- Answer: pending

### CR-16: Overview: AI drafts awaiting review

- Requested by: D-WP-0 (DR-002 H; REQ-OVR-01), 2026-11-20
- Screen or test: clinician overview
- Endpoint and contract: overview endpoint
- What is missing: An "AI drafts awaiting review" list with count.
- Why: DR-002 H; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): WP 5.2
- Blocking: No. The group appears when the field does.
- Status: delivered (WP 5.2, branch `wp/5.2`)
- Answer: `ClinicianOverview.aiDraftsAwaitingReview` (`{ count, items }`): succeeded generations of care-team patients with no decision and no regeneration, oldest first; each item has `generationId`, `patient`, `kind`, `reviewState` (`unreviewed` or `in_review`), `createdAt`, `unsupportedStatementCount`.

### CR-17: Idempotency key on booking

- Requested by: D-WP-0 (`10`; DR-002 F), 2026-11-20
- Screen or test: `(patient)/(app)/appointments`
- Endpoint and contract: booking request
- What is missing: An idempotency key on the booking request.
- Why: DR-002 F; filed from `docs/design/rebuild-plan.md` section 5.
- Owner (WP): B-CR
- Blocking: No. Until it lands the unknown-outcome banner tells the patient to check Appointments.
- Status: open
- Answer: pending

### CR-18: Entered-in-error permission and header-only answer

- Requested by: advisor, checkpoint C3 (sections 1.2 and 4.3), 2026-11-20
- Screen or test: signed note, mark entered in error; `apps/api/test/phase5/ai.test.ts` (administrator path)
- Endpoint and contract: `POST …/notes/:noteId/entered-in-error`; `packages/shared/src/contracts/permissions.ts`
- What is missing: A permission key `note.mark_entered_in_error` ("Mark a signed clinical note entered in error, with a reason"), granted to `clinic_admin` only by migration. The route admits `note.sign` or `note.mark_entered_in_error`; the handler requires that the caller is the author or holds `note.mark_entered_in_error`, and compares no role name. A caller without `clinical.read` gets the note header (id, type, status, author, signed time, the entered-in-error block) with `versions: []` and `currentVersion: null`, so no note text. The audit `purposeOfUse` and `detailCode` follow the permission used.
- Why: A clinic administrator was sent the full note text without `clinical.read` and without a `phi.read` event; `settings.manage` is not an accepted gate.
- Owner (WP): WP 5.6b (items B1, B3)
- Blocking: Yes, WP 5.3 and any administrator action from the audit viewer (WP 6.2).
- Status: open
- Answer: pending

### CR-19: Error code `encounter_already_documented`

- Requested by: advisor, checkpoint C3 (sections 1.2 and 6), 2026-11-20
- Screen or test: `POST …/notes/:noteId/sign`; WP 5.3 note editor
- Endpoint and contract: note sign endpoint; `packages/shared/src/contracts/errors.ts`
- What is missing: Error code `encounter_already_documented`, answered 409 when a signed note already exists for the encounter. The database rule is a partial unique index on `ClinicalNote(encounterId)` where `status = 'signed'`. Marking a note entered in error frees the visit for a corrected note.
- Why: Two signed notes for one visit were possible, because each approved draft becomes its own note.
- Owner (WP): WP 5.6b (item B4)
- Blocking: Yes, WP 5.3 (the sign action must handle the 409).
- Status: open
- Answer: pending
