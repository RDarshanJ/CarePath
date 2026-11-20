# CarePath API, Phase 3 route table (Scenarios A to D)

Date: 2026-11-19 (WP 3.0, M3). Synthetic data only; not for clinical use. Basis: checkpoint C1 (`docs/decisions/checkpoint-c1.md`) sections 3.5, 3.7, 3.8, 5.2 and 5.4, PRD sections 5, 7, 8 and 16. Where this note and the PRD differ, C1 wins.

This is the contract between WP 3.1 (API) and WP 3.2 and 3.3 (UI). WP 3.1 builds these routes, in the delivery order of section 7. UI workers build against the names here and the schemas in `@carepath/shared/contracts`. A UI worker who needs a change appends it to `docs/decisions/contract-requests.md`; nobody but the API worker edits `packages/shared/src/contracts`.

## 1. Rules

1. **One route family for patient-owned resources.** Everything that belongs to a patient lives under `/patients/:patientId/...` for every role. No `/me` aliases. The patient client reads its id from `GET /auth/session` (`patientId`).
2. **One public write.** `POST /onboarding/accounts` takes email, password and eligibility code in one request. Code check, code redemption, user, membership, patient and intake are one transaction, so an invalid, used or expired code creates nothing (AC-A3). The UI may still show two steps; it submits once.
3. **One origin for the browser.** `apps/web` rewrites `/api/:path*` to the API (`next.config.ts`, owned by WP 3.2a). The browser only talks to the web origin, so the session cookie is first-party. Server components call the API directly, forward the incoming `cookie` header and only issue GETs. Client mutations go through `/api` with `x-csrf-token` from `GET /auth/session`. `NEXT_PUBLIC_API_URL` is gone.
4. **Proxy address.** The API runs with `TRUST_PROXY=loopback` behind the rewrite, so rate limits and IP hashes use `X-Forwarded-For` when, and only when, the socket peer is loopback. If the Next.js rewrite does not forward the client address, the per-address limit is effectively per deployment in this demo; WP 3.2a records which one it observed.
5. **Scope.** Every route with a tenant id in its path looks that id up through one scoped helper per resource (`organizationId` always, `patientId` for the patient role, the parent patient for child ids such as `sessionId`, `taskId`, `checkInId`, `versionId`). Out of scope answers 404 with the byte-identical body and a `security.access_denied` event. A same-organization clinician off the care team gets 403 `not_on_care_team` on clinical writes (ruling 3.2). WP 3.1 gate M8 enumerates every such route from OpenAPI.
6. **Shapes by role.** Coordinators and admins have no `clinical.read`. Directory and record reads return an administrative shape for them (ruling 3.7): the response is a union discriminated by `view: "clinical" | "administrative"`.
7. **Drafts never reach patients.** No patient-facing response contains `CarePlan.draftContent` (AC-B1). The draft preview and the patient plan endpoint render through one serializer (REQ-PLN-05).
8. **Writes.** Every create uses the `initialStatus` map in `packages/db/src/status.ts` (ruling 3.4, added in WP 3.1). Every mutation and its audit event run in one transaction (`withTx`, M4).
9. **Time.** Instants are ISO 8601 UTC strings. Calendar days ("today", "due", weekly buckets) are computed by the API in the organization's time zone and returned as `YYYY-MM-DD` with the zone named; the web never derives them from the browser clock (ruling 3.8). Gates start the API with `CAREPATH_FIXED_NOW` (non-production only).
10. **Lists.** Cursor pagination: `?cursor=<opaque>&limit=<1..100>` (default 25), response `{ items, nextCursor }`. Sorting and filtering happen in SQL.
11. **Mutations.** `POST`, `PUT`, `PATCH`, `DELETE` need an allowed `Origin` and `x-csrf-token`. Bodies are JSON and `.strict()` (unknown keys are a 400).

## 2. Error codes

Envelope: `ErrorEnvelope` (`{ "error": { "code", "message", "details"? } }`). The web branches on `code` only. Every route can also answer 401 `unauthenticated` or `session_expired`, 403 `origin_rejected` or `csrf_failed` on mutations, 403 `forbidden` without the route permission, 429 `rate_limited` and 500 `internal_error`; the tables below list only route-specific codes.

| Code | Status | Meaning | Status in the codebase |
|---|---|---|---|
| `validation_error` | 400 | Body, query or path failed its schema; `details` name the paths | exists |
| `not_found` | 404 | Missing or out of scope (identical body) | exists |
| `not_on_care_team` | 403 | Clinical write by a clinician off the care team | exists |
| `booking_conflict` | 409 | Overlapping booking or slot (SQLSTATE 23P01) | exists (M5) |
| `already_exists` | 409 | Unique key taken (23505), for example a second open session or a concurrent publish | exists (M5) |
| `invalid_transition` | 409 | Status change not allowed (CP001) | exists (M5) |
| `rule_violation` | 409 | Domain rule enforced by trigger (CP003), for example a parent of another patient | exists (M5) |
| `eligibility_code_invalid` | 400 | Code unknown, used or expired. One code for all three, so codes cannot be probed | exists (WP 3.1) |
| `account_exists` | 409 | Email already registered | exists (WP 3.1) |
| `intake_incomplete` | 409 | Submit with required answers or the required consent missing; `details` list the missing steps | exists (WP 3.1) |
| `consent_required_type` | 409 | A patient tried to revoke the required consent (Q4: withdrawn through the clinic) | exists (WP 3.1) |
| `draft_stale` | 409 | Publish or autosave against an older draft than the stored one | exists (WP 3.1) |
| `session_open` | 409 | Start while another session is in progress or paused; `details` carry no id, the client re-reads Today | exists (WP 3.1) |
| `session_closed` | 409 | Action on a completed, abandoned or stopped session | exists (WP 3.1) |
| `plan_not_published` | 409 | Session start for a patient with no published plan version | exists (WP 3.1) |
| `slot_unavailable` | 409 | Booking a slot that is in the past or blocked. A slot someone else took is `booking_conflict` | exists (WP 4.1) |

## 3. Existing routes (WP 2.4)

| Method | Path | Access | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/health` | public | | `Health` | 503 when the database does not answer |
| POST | `/auth/login` | public | `LoginRequest` | `SessionInfo` | 401 `invalid_credentials`, 400 `organization_required` |
| POST | `/auth/logout` | session | | 204 | |
| GET | `/auth/session` | session | | `SessionInfo` | Source of `patientId` and `csrfToken` |
| GET | `/roles` | `roles.read` | | `RoleMatrix` | |
| GET | `/patients/:patientId` | `patient.read`, `patient.read_own` | `PatientIdParams` | `PatientHeader` | Writes `phi.read` |

## 4. Scenario A: enrollment and onboarding

| Method | Path | Access | Request | Response | Route-specific errors | Audit |
|---|---|---|---|---|---|---|
| POST | `/onboarding/accounts` | public, rate limited like login | `CreateAccountRequest` (email, password, eligibilityCode, givenName, familyName, birthDate) | 201 `SessionInfo`, sets the session cookie | 400 `eligibility_code_invalid`, 409 `account_exists` | `account.create` |
| GET | `/patients/:patientId/intake` | `patient.read_own`, `clinical.read`, `enrollment.manage` | | `IntakeState` (status, currentStep, firstIncompleteStep, steps with answers, missing). `enrollment.manage` without `clinical.read` gets completeness only (no answers) | | `phi.read` for staff |
| PUT | `/patients/:patientId/intake/steps/:step` | `patient.update_own` | `IntakeStepSave` (one step's answers; `step` is one of the brief's onboarding steps after the account) | `IntakeState` | 409 `invalid_transition` once submitted | |
| POST | `/patients/:patientId/intake/submit` | `patient.update_own` | `IntakeSubmitRequest` (empty object) | `IntakeState`; patient moves `intake_incomplete -> awaiting_assignment` | 409 `intake_incomplete` | |
| GET | `/patients/:patientId/consents` | `consent.manage_own`, `consent.read` | | `ConsentList` (each type, status, text version, granted and revoked times) | | |
| POST | `/patients/:patientId/consents` | `consent.manage_own` | `ConsentGrantRequest` (type, textVersion) | 201 `Consent` | 409 `already_exists` (active consent of that type) | `consent.grant` |
| POST | `/patients/:patientId/consents/:consentId/revoke` | `consent.manage_own` | `ConsentRevokeRequest` (empty object) | `Consent` | 409 `consent_required_type`, 409 `invalid_transition` | `consent.revoke` |
| GET | `/patients` | `patient.read` | `PatientDirectoryQuery` (q, status, clinicianId, lastActivityBefore, hasUpcomingAppointment, planStage, hasOpenReview, sort, cursor, limit) | `PatientDirectoryPage`: items are `PatientDirectoryRow` (`view: "clinical"`) or `PatientAdminRow` (`view: "administrative"`, includes `missingIntake`) | | |
| GET | `/practitioners` | `assignment.manage`, `patient.read` | | `PractitionerList` (id, display name, active caseload count) | | |
| GET | `/patients/:patientId/care-team` | `patient.read_own`, `patient.read` | | `CareTeamCard` (members with name and role) | | |
| POST | `/patients/:patientId/care-team/assignments` | `assignment.manage` | `AssignClinicianRequest` (practitionerId) | `CareTeamCard`; patient moves `awaiting_assignment -> active` | 409 `invalid_transition` (not awaiting assignment) | `assignment.create` |

Onboarding steps after account creation, in order (brief section 4, REQ-ONB-01 "Step n of 11"): `personal_information`, `primary_goal`, `body_area`, `pain_levels`, `activity_limitations`, `clinician_preferences`, `appointment_availability`, `consent`, `review`. Step 1 is account creation and step 2 the eligibility code, both in `POST /onboarding/accounts`. The `review` step and the pain notice are the only places the banned diagnostic terms are checked (`BANNED_DIAGNOSTIC_TERMS` in `@carepath/shared`).

## 5. Scenario B: care plan

| Method | Path | Access | Request | Response | Route-specific errors | Audit |
|---|---|---|---|---|---|---|
| GET | `/exercises` | `clinical.read` | `ExerciseLibraryQuery` (q, bodyArea, category, cursor, limit) | `ExerciseLibraryPage` | | |
| GET | `/patients/:patientId/care-plan` | `careplan.read_own`, `clinical.read` | | `PatientCarePlan`: current published version only, with change note, author name, publish date and `diffFromPrevious` (added, removed, changed exercises). `null` plan when none is published | | `phi.read` for staff |
| GET | `/patients/:patientId/care-plan/versions` | `careplan.read_own`, `clinical.read` | | `CarePlanVersionList` (number, author, time, change note) | | |
| GET | `/patients/:patientId/care-plan/versions/:versionId` | `careplan.read_own`, `clinical.read` | | `CarePlanVersionDetail` (same serializer as `PatientCarePlan`) | | |
| POST | `/patients/:patientId/care-plan/versions/:versionId/acknowledge` | `careplan.read_own` | `PlanChangeAcknowledge` (empty object) | 204. Hides the plan-change explanation on Today (REQ-TOD-02) | | |
| GET | `/patients/:patientId/care-plan/draft` | `clinical.read` | | `CarePlanDraft` (content, updatedAt, author) or 404 when there is no draft | | |
| PUT | `/patients/:patientId/care-plan/draft` | `clinical.write`, care team only | `CarePlanDraftSave` (title, instructions, items with exercise, dose, schedule and position, goals, expectedUpdatedAt) | `CarePlanDraft`. Creates the plan in its initial status when the patient has none | 409 `draft_stale`, 403 `not_on_care_team` | |
| GET | `/patients/:patientId/care-plan/draft/preview` | `clinical.read` | | `PatientCarePlan` rendered from the draft through the patient serializer | | |
| POST | `/patients/:patientId/care-plan/publish` | `careplan.publish`, care team only | `CarePlanPublishRequest` (changeNoteForPatient, required from version 2: a missing note is a 400 `validation_error` on `changeNoteForPatient`, AC-B4; expectedUpdatedAt) | 201 `CarePlanVersionDetail` | 409 `draft_stale`, 409 `already_exists` (concurrent publish), 403 `not_on_care_team` | `careplan.publish` |

Reordering is part of `CarePlanDraftSave` (positions), driven by move up and move down buttons (AC-B8). A session in progress keeps its version (AC-B5).

## 6. Scenarios C and D: sessions, check-ins, progress, review

| Method | Path | Access | Request | Response | Route-specific errors | Audit |
|---|---|---|---|---|---|---|
| GET | `/patients/:patientId/today` | `careplan.read_own` | | `TodayView`: organization-local date and zone, plan summary, today's session state (`due`, `in_progress`, `paused`, `done`, `not_scheduled`) with the open session id, check-in due, unacknowledged plan change, weekly progress summary. Appointment and message fields arrive in Phase 4 | | |
| GET | `/patients/:patientId/clinic` | `patient.read_own`, `patient.read` | | `ClinicCard` (name, phone or null, replyTimeText, `EMERGENCY_NOTICE`) | | |
| POST | `/patients/:patientId/sessions` | `session.write_own` | `SessionStartRequest` (empty object: always the current version) | 201 `ExerciseSessionDetail` | 409 `session_open` | |
| GET | `/patients/:patientId/sessions` | `session.write_own`, `clinical.read` | `CursorQuery` | `ExerciseSessionPage` | | |
| GET | `/patients/:patientId/sessions/:sessionId` | `session.write_own`, `clinical.read` | | `ExerciseSessionDetail` (version, activities with exercise content and dose, current position, elapsed time, status) | | |
| POST | `/patients/:patientId/sessions/:sessionId/pause` | `session.write_own` | `SessionProgress` (currentPosition, elapsedSeconds) | `ExerciseSessionDetail` | 409 `session_closed`, 409 `invalid_transition` | |
| POST | `/patients/:patientId/sessions/:sessionId/resume` | `session.write_own` | `SessionResumeRequest` (empty object) | `ExerciseSessionDetail` at the stored position (AC-C1) | 409 `session_closed`, 409 `invalid_transition` | |
| PUT | `/patients/:patientId/sessions/:sessionId/activities/:activityId` | `session.write_own` | `SessionActivityUpdate` (status `completed` with counts and duration, or `skipped` with `skipReason`, AC-C3; optional discomfort level and note) | `ExerciseSessionDetail` | 409 `session_closed`, 409 `invalid_transition` | |
| POST | `/patients/:patientId/sessions/:sessionId/stop` | `session.write_own` | `SessionStopRequest` (activityId, discomfortLevel 0 to 10, optional note) | `ExerciseSessionDetail` with status `stopped_discomfort` and `checkInRequested: true` (AC-C4) | 409 `session_closed` | |
| POST | `/patients/:patientId/sessions/:sessionId/complete` | `session.write_own` | `SessionProgress` | `ExerciseSessionDetail` | 409 `session_closed`, 409 `invalid_transition` | |
| POST | `/patients/:patientId/check-ins` | `checkin.write_own` | `CheckInCreate` (sessionId or null, painScore 0 to 10, difficulty, notes) | 201 `CheckInResult`: the check-in, `seenBy: "care_team"` (AC-C6) and `painNotice` (null below the threshold, else clinic phone or null, `EMERGENCY_NOTICE`; AC-D7). The pain rule runs in the same transaction and writes at most one open task (AC-D1, D2) | 409 `session_closed` when the session belongs to a finished day | |
| GET | `/patients/:patientId/check-ins` | `checkin.write_own`, `clinical.read` | `CursorQuery` | `CheckInPage` | | |
| GET | `/patients/:patientId/check-ins/:checkInId` | `checkin.write_own`, `clinical.read` | | `CheckIn`. The target of a pain task's source link (AC-D1) | | |
| POST | `/patients/:patientId/check-ins/:checkInId/review` | `clinical.write`, care team only | `CheckInReviewRequest` (empty object) | `CheckIn` with reviewedAt and reviewer | 409 `already_exists` when already reviewed | |
| GET | `/patients/:patientId/progress` | `careplan.read_own`, `clinical.read` | `ProgressQuery` (weeks, 1 to 12) | `ProgressView`: weekly assigned versus completed, completed sessions, patient-reported pain series with a table form, goals. Read from the same rows as the clinician activity history (AC-C2) | | |
| GET | `/overview` | `clinical.read` | | `ClinicianOverview`: work lists with counts (open tasks, unreviewed check-ins, missed activity, recent publishes); each count equals its list length (REQ-OVR-01). Appointment, message and AI lists arrive in Phases 4 and 5 | | |
| GET | `/patients/:patientId/timeline` | `clinical.read` | `CursorQuery` | `TimelinePage` (union of plan versions, sessions, check-ins, tasks, ordered by time) | | `phi.read` |
| GET | `/patients/:patientId/record-history` | `clinical.read` | `CursorQuery` | `RecordHistoryPage` built from domain rows, not `AuditEvent` (ruling 3.7) | | |
| GET | `/review-tasks` | `review_task.read` | `ReviewTaskQuery` (status, assignedTo, ruleKey, cursor, limit) | `ReviewTaskPage` (rule, value, threshold, explanation, source link, age). Empty list carries `lastCheckedAt` (AC-D6) | | |
| GET | `/patients/:patientId/review-tasks` | `review_task.read` | `CursorQuery` | `ReviewTaskPage` | | |
| POST | `/patients/:patientId/review-tasks/:taskId/assign` | `review_task.resolve`, care team only | `ReviewTaskAssign` (practitionerId or null) | `ReviewTask` | 409 `invalid_transition` | |
| POST | `/patients/:patientId/review-tasks/:taskId/resolve` | `review_task.resolve` (clinical rules, care team only), `review_task.resolve_admin` (administrative rules) | `ReviewTaskResolve` (note, required) | `ReviewTask` with resolver and time (AC-D5) | 409 `invalid_transition` | `review_task.resolve` |
| POST | `/patients/:patientId/review-tasks/:taskId/dismiss` | same as resolve | `ReviewTaskResolve` (note, required) | `ReviewTask` | 409 `invalid_transition` | `review_task.resolve` |
| GET | `/review-rules` | `review_task.read`, `review_rule.manage` | | `ReviewRuleList` (key, label, enabled, params, description stating the defaults are arbitrary demo values) | | |
| PUT | `/review-rules/:ruleId` | `review_rule.manage` | `ReviewRuleUpdate` (enabled, params validated per rule key) | `ReviewRule`. Later check-ins use the new value (AC-D4) | | `review_rule.update` |

Time-based rules (missed sessions, unreviewed check-in, upcoming follow-up, missing intake) and the 24-hour session abandonment are job handlers that build a system context from `job.organizationId` and use the same scoped repositories. Default thresholds (ruling 3.7, arbitrary demo values, same in the seed): pain 7, missed sessions 2 in 7 days, unreviewed check-in 48 hours, follow-up within 48 hours, intake incomplete 3 days.

## 7. Delivery order for WP 3.1 (C1 section 5.4)

1. Patient reads: `today`, `care-plan`, `care-plan/versions(/:versionId)`, `sessions`, `sessions/:sessionId`, `check-ins`, `progress`, `clinic`.
2. Session and check-in writes: start, pause, resume, activity update (skip with reason), stop, complete, check-in with the pain rule.
3. Clinician reads: `overview`, `patients`, `timeline`, `record-history`, `exercises`, `review-tasks`.
4. Plan draft autosave, preview, publish.
5. Review task assign, resolve, dismiss. Check-in reviewed. Review rules read and update.
6. Onboarding, intake autosave and submit, consents, `practitioners`, care-team assignment.

## 8. Contract names

All request and response names above become Zod schemas in `packages/shared/src/contracts/<domain>.ts`, exported from `@carepath/shared/contracts`, with `.meta({ id })` equal to the name so `apps/api/openapi.json` uses the same name. Domains: `auth`, `errors`, `health`, `patients`, `roles`, `permissions` (exist now); `onboarding`, `intake`, `consents`, `care-team`, `care-plan`, `exercises`, `sessions`, `check-ins`, `progress`, `today`, `clinic`, `review` (added by WP 3.1 in the delivery order above). Names that exist today: `LoginRequest`, `SessionInfo`, `ErrorEnvelope`, `Health`, `RoleMatrix`, `PatientIdParams` (unnamed path schema `patientIdParamsSchema`), `PatientHeader`. Fixed copy shared by both apps: `EMERGENCY_NOTICE`, `CONTACT_CLINIC_FALLBACK`, `BANNED_DIAGNOSTIC_TERMS` in `@carepath/shared`.

### 8.1 Contract notes from WP 3.1

- Contracts are committed in `packages/shared/src/contracts/` before the endpoints, so UI work can start. Added domains beyond the list above: `common` (cursor query, page shape, person reference, body areas), `overview` (`ClinicianOverview`), `records` (`TimelinePage`, `RecordHistoryPage`).
- `CarePlanVersionDetail` is the one patient-facing plan shape (`carePlanViewSchema`); `PatientCarePlan` is `{ plan: CarePlanVersionDetail | null }`. The draft preview returns `PatientCarePlan` with `plan.preview = true` and `version.id = null`.
- Draft items carry `position` equal to their index; reordering sends the list in the new order with positions renumbered.
- Intake answers per step are `intakeAnswerSchemas[step]`; the PUT body is `{ "answers": { ... } }`. Saving the `consent` step writes the Consent rows in the same transaction.
- Review tasks carry `value`, `threshold`, `unit`, `sources[]` (type, id, field, `apiPath`) next to the explanation sentence.
- Cursors are opaque strings. Clients pass `nextCursor` back unchanged and never build one.
- Plan-change acknowledgement is stored as the read time of the patient's `care_plan_published` notification for that version.
- Review task assign sets `in_review` when a practitioner is given and `open` when unassigned (the PRD's "assigned" state, C1 ruling 3.7).
- `GET /review-tasks` and `ReviewTaskPage` carry `lastCheckedAt` (when the queue was read) and `rulesLastRunAt` (last successful time-rule job for the organization, or null).
- Body ids that do not belong to the caller's scope (`sessionId` in a check-in, `activityId` in a stop, exercise and goal ids in a draft, `practitionerId` in assign) answer 400 `validation_error` on that path; path ids answer 404 (rule 5).
- Time-based rules and abandonment run every 15 minutes per organization (queues `review.time_rules`, `sessions.abandon_idle`), enqueued by the API process with a dedupe key per slot; `pnpm jobs:drain` runs them by hand.
- Implemented in WP 3.1: every route in sections 4 to 6 (51 operations in `apps/api/openapi.json`, 39 with an id in the path, all enumerated by the M8 test).

## 9. Gate ports (C1 section 4)

| Gate | API | Web | Database |
|---|---|---|---|
| `pnpm verify` | 4090 | 3090 | `carepath_verify_<pid>` |
| WP 3.1 | 4031 | | `carepath_wp31_<pid>` |
| WP 3.2 | 4032 | 3032 | `carepath_wp32_<pid>` |
| WP 3.3 | 4033 | 3033 | `carepath_wp33_<pid>` |

Ports 4000 and 3000 are for hand use only. Every gate sources `scripts/gate-env.sh <name> <api_port> [web_port]`; the web build, `next start` and Playwright run under `scripts/with-web-lock.sh`.

## 10. Phase 4 scheduling (WP 4.1)

Basis: checkpoint C2 section 2 (appointment and slot ruling), ruling 3.1 (CR-1) and section 6.4; PRD Scenario E. Contracts in `packages/shared/src/contracts/scheduling.ts`; module `apps/api/src/modules/scheduling`. Every rule in section 1 applies. Calendar days are clinic-zone days and every response names the zone in `timezone`.

| Method | Path | Access | Request | Response | Route-specific errors | Audit |
|---|---|---|---|---|---|---|
| GET | `/practitioners/:practitionerId/slots` | `appointment.manage_own`, `appointment.read` | `SlotQuery` (from, to: clinic-zone days, default today and 13 days on, at most 31 days; type) | `SlotList` (practitioner, timezone, from, to, `days[]` of `{ date, slots: OpenSlot[] }`). Open slots starting after the API clock only | 400 `validation_error` on `to` for a bad range. A patient asking for a practitioner off their care team gets 404 | `security.access_denied` on 404 |
| GET | `/patients/:patientId/appointments` | `appointment.manage_own`, `appointment.read` | `PatientAppointmentQuery` (`when`: upcoming or past; cursor, limit) | `AppointmentPage` (timezone, items, nextCursor). Upcoming: not cancelled and not ended, soonest first. Past: ended or cancelled, newest first | | `phi.read` for staff |
| POST | `/patients/:patientId/appointments` | `appointment.manage_own` (patient, own record, care-team therapist only), `appointment.manage` (coordinator, any patient in the organization) | `AppointmentBook` (slotId, type, reason) | 201 `Appointment` | 409 `booking_conflict` (slot already booked, or the patient or practitioner is busy then), 409 `slot_unavailable` (past or blocked slot), 400 `validation_error` on `body.slotId` (`unknown_slot`, `not_care_team_practitioner`) or `body.type` (`type_not_offered`) | `appointment.book` |
| POST | `/patients/:patientId/appointments/:appointmentId/cancel` | as booking | `AppointmentCancel` (reason, optional) | `Appointment` with `cancelled_by_patient` (patient) or `cancelled_by_clinic` (staff); the slot is `open` again | 409 `invalid_transition` (already cancelled, started or past) | `appointment.cancel` |
| POST | `/patients/:patientId/appointments/:appointmentId/reschedule` | as booking | `AppointmentReschedule` (slotId) | 201 `Appointment`: the new booking, `rescheduledFromId` set; the old one is cancelled with reason "Rescheduled" and `rescheduledToId` set | as booking and cancel; 400 `same_slot`. On any failure the original booking is unchanged (AC-E7) | `appointment.cancel` and `appointment.book` |
| GET | `/appointments` | `appointment.read` | `AppointmentDayQuery` (date, practitionerId; both required) | `AppointmentList` (date, timezone, practitioner, items of every status by start time). CR-1: `ClinicianOverview` does not grow; the overview makes this second call | 400 `validation_error` on `querystring.practitionerId` for a practitioner outside the organization | |

`GET /patients/:patientId/today` gains `nextAppointment` (`NextAppointment` or null): the next `booked` or `checked_in` visit that has not ended.

Booking transaction (C2 section 2): lock the slot with `SELECT ... FOR UPDATE`, check it, move it `open -> booked`, insert the appointment in `initialStatus.Appointment` and write `appointment.book`, all in one transaction. Concurrent requests for one slot queue on the row lock; each one after the first sees `booked` and answers 409 `booking_conflict`. The exclusion constraints and `Appointment_slot_live_key` stay the last line of defence and map to the same 409. Cancel locks the slot, then the appointment. Reschedule locks both slots in id order, then the appointment, cancels and books in one transaction. Booking transactions wait up to 15 s for a connection and may run 20 s, so a burst of 50 requests for one slot does not time out (`docs/evaluation/booking-concurrency.md`).

The appointment always takes the whole slot (`startsAt` and `endsAt` copied from it). Therapists and admins read appointments but do not book or cancel (`appointment.read` only).

Reminder job: queue `scheduling.appointment_reminders`, enqueued every 15 minutes per active organization like the review rules, handler scoped by `job.organizationId`. For each `booked` visit starting within the next 24 hours whose patient has a login and no reminder yet, it sets `reminderSentAt` and writes one `appointment_reminder` notification ("Visit coming up", the visit type, practitioner and local time with the clinic zone named, link `/appointments`) in one transaction, so a rerun writes nothing twice.

