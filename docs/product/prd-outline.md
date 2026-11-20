# CarePath PRD: outline and review brief

Date: 2026-11-19. From: advisor. To: the author of `docs/product/prd.md`.

This is what the PRD must contain and what I will check it against. Authority order: `docs/decisions/advisor-plan-rev1.md`, then `advisor-plan.md`, then `docs/BRIEF.md`. Where the PRD departs from the brief, it says so in its revisions section with a reason.

## 1. Rules for the author

1. Every requirement has an ID (`REQ-A-01`), a role, and at least one acceptance criterion a test can assert. "User-friendly" is not a criterion.
2. Every requirement is tagged **Core**, **Stretch** or **Cut**, matching plan §1 and revision 1. Do not add Core scope. Propose additions as open questions.
3. Cite research by document and section (for example "CA Gaps 1", "HD §8"). Tag each rationale as observed, standards-driven, or assumption. Use `docs/research/product-opportunities.md` for the evidence labels.
4. Personas are headed "assumption-based, not from research participants". No quotes, no participants, no outcome numbers.
5. Numbers are targets and are written as targets. No measured results exist yet.
6. Follow plan §6 and the revision 1 honesty amendments. Do not write: HIPAA compliant or ready, clinically validated, risk prediction, SMART on FHIR, US Core conformant, passes the HL7 validator.
7. Do not specify screens pixel by pixel. Reference plan §4 for design rules.
8. Plain sentences. No exclamation marks. No placeholder text. Target length 3,500 to 5,000 words.

## 2. Required section outline

| # | Section | Must contain |
|---|---|---|
| 1 | Summary | What CarePath is, who it is for, the demonstration and synthetic-data statement. |
| 2 | Problem and opportunity | The nine opportunities from `product-opportunities.md` in brief, each with its evidence label. |
| 3 | Goals and non-goals | Goals tied to Scenarios A to I. Non-goals: diagnosis, treatment recommendation, billing, real patients, compliance certification, live EHR integration. |
| 4 | Users and roles | Patient, physical therapist, care coordinator, clinic admin, system actor. Assumption-based personas. Jobs to be done per role. |
| 5 | Permission matrix | Resource by role, from HD §2.4 as amended by revision 1 (org-wide clinician read, care-team write, no break-glass). |
| 6 | Care lifecycle | Enrollment to follow-up as one journey, naming which role acts at each step and which scenario covers it. |
| 7 | Functional requirements | One subsection per area: onboarding, Today, session, check-in and pain, progress, appointments, messaging, assistant, clinician overview, directory, record, plan builder, review queue, notes, AI summaries, admin, FHIR, audit. |
| 8 | Scenario acceptance criteria | Scenarios A to I, using section 3 of this brief as the minimum. |
| 9 | State models | Appointment, care plan and version, exercise session, clinical note, review task, AI generation and review, consent, onboarding. Allowed transitions and who may trigger each. |
| 10 | Review rules | Each rule: name, trigger, default threshold, configurable by whom, explanation text shown, source record. A statement that rules are administrative and unvalidated. |
| 11 | AI requirements | Provider labelling, evidence model, unsupported-statement handling, consent gate, redaction, refusal scope of the assistant, human approval, evaluation set. |
| 12 | Interoperability | The ten mappings plus Consent, Bundle types, the three validation layers, US Core 6.1.0 pin, import behaviour, Synthea demo, wording limits. |
| 13 | Privacy and security | Session rules, isolation, audit event list, log redaction, rate limits, what is not claimed. |
| 14 | Accessibility | WCAG 2.2 AA target, the specific criteria in revision 1, test method, the limits of what will be claimed. |
| 15 | Non-functional targets | Latency, concurrency, coverage and count targets from brief §19, written as targets, with the two-CPU test environment noted. |
| 16 | Content and safety copy | The exact fixed strings in section 4 of this brief and where each appears. |
| 17 | Scope table | Core, Stretch, Cut for every brief feature. |
| 18 | Revisions to the brief | Every change with its reason. Start from revision 1 §3. |
| 19 | Assumptions, risks, open questions | Including the five untested assumptions listed in `product-opportunities.md`. |
| 20 | Traceability | A table: requirement ID to scenario, test type (API, Playwright, unit) and plan work package. |

## 3. Non-negotiable requirements and acceptance criteria per scenario

These are minimums. The author may add criteria and may not weaken them. Each "Given, when, then" must map to at least one automated test in section 20 of the PRD.

### Scenario A: New patient enrollment

Requirements

- Steps: account, eligibility code, personal information, goal, body area, pain level, activity limitations, clinician preference, availability, consent, review. Back navigation and a progress indicator on every step.
- Autosave on each step. Resume returns to the first incomplete step on any device after login.
- Field errors are announced to assistive technology and tied to their field. Paste and password managers work on every credential field. No stored answer is asked twice.
- Required agreement and optional AI-assisted features are separate, labelled in words, optional defaults to off, and the screen says where to change it later.
- No output of onboarding states or implies a diagnosis.

Acceptance criteria

- Given a patient who leaves at step 5, when they sign in again, then they land on step 5 with steps 1 to 4 intact.
- Given a completed onboarding, then the patient has status "awaiting assignment", an active required consent row with the consent text version, and appears in the admin enrollment list without a page reload beyond the normal refetch.
- Given an invalid or reused eligibility code, then the API returns a 4xx with the standard error shape and no account is created.
- Given an incomplete intake, then the patient cannot be marked ready and a "missing intake information" state is visible to staff.
- Audit contains account creation and consent capture.

### Scenario B: Clinician assigns a treatment plan

Requirements

- Plan builder: exercise library search and filter, assignment with repetitions, sets or duration and weekly schedule, goals, clinician instructions, draft and published states, version history.
- Reordering uses buttons. No drag.
- Publishing creates an immutable version. Publishing version 2 or later requires a patient-facing change note.
- The builder shows the patient's view of the plan before publishing.
- Only a clinician on the patient's care team can write the plan.

Acceptance criteria

- Given a draft, then the patient API returns no trace of it.
- Given a publish, when the patient next loads Today, then the new version is the one shown and a session started afterwards references that version.
- Given a publish of version 2, then the patient sees the clinician's note, the computed list of added, removed and changed exercises, the clinician's name and the date.
- Given a publish of version 2 without a change note, then the API rejects it with a validation error.
- Given a session in progress on version 1 when version 2 is published, then that session completes against version 1 and history shows which version it used.
- Given a clinician in the same organisation who is not on the care team, then a write returns 403 and is audited. Given a clinician in another organisation, then 404 and a security event.
- Version history lists every version with author and time, and no version can be edited.

### Scenario C: Exercise completion

Requirements

- Session flow: overview, instructions, illustration, assigned dose, progression through exercises, rest timer, pause and resume, skip with reason, report discomfort, completion, post-session check-in.
- Every step is completable by keyboard and by single taps. No camera is required.
- Session state persists on the server at each step.
- Pain is a 0 to 10 button group with word anchors. After submission the patient reads "Your therapist will see this".
- Progress views label pain as patient-reported and never caption activity as improvement. Every chart has a table alternative.

Acceptance criteria

- Given a session interrupted at exercise 3 of 5, when the patient returns, then it resumes at exercise 3 with prior steps recorded.
- Given a completed session and check-in, then weekly progress on the patient side and activity history on the clinician record show the same counts and pain value, read from the same rows.
- Given a skipped exercise, then it is recorded as skipped with its reason and is not counted as completed.
- Given "Stop, this hurts", then the session ends as stopped, a pain report is requested, and the clinician can see that the session was stopped for discomfort.
- The Playwright run of this scenario at 390 by 844 uses keyboard input only for at least one full pass. Axe reports no serious or critical findings.

### Scenario D: Patient requires review

Requirements

- Rules are data: type, threshold, enabled flag, editable by clinic admin. Minimum set: reported pain at or above threshold, missed assigned sessions, unreviewed check-in, upcoming follow-up, missing intake information.
- Each task shows the rule name, the triggering value, the threshold, the time, and a link to the source record.
- Tasks support assign and resolve, with a resolution note. One open task per rule and source, no duplicates.
- The queue is described in the UI as rule-based. No risk score.
- A threshold pain report shows the patient a contact-your-clinic notice with the emergency line. No diagnostic wording.

Acceptance criteria

- Given a check-in with pain at the threshold, then exactly one review task exists, its explanation payload carries rule, value and threshold, and its link opens the check-in.
- Given the same check-in processed twice, then there is still one task.
- Given pain one below the threshold, then no pain task is created.
- Given an admin changes the threshold, then later check-ins use the new value and the change is audited.
- Given a resolved task, then it leaves the open queue, keeps its history, and the resolver and time are recorded.
- An empty queue shows a clear state, not a blank table.

### Scenario E: Appointment booking

Requirements

- Clinician profiles, appointment types, open slots from persisted availability, confirmation, reschedule, cancel, in-app reminders.
- Availability is verified on the server at booking time. Overlap is prevented by database constraints for both practitioner and patient.
- Times are stored in UTC and displayed in the viewer's time zone with the zone named.
- Reschedule is atomic: the old slot is released only if the new booking succeeds.
- On conflict the patient sees nearby open slots and keeps their other selections.
- Messaging requirements live here for testing purposes: sender name and role, unread state, delivery and failure states, typical reply time, "Not monitored for emergencies".

Acceptance criteria

- Given 50 parallel requests for one slot, then exactly one succeeds and 49 receive HTTP 409, repeated 20 times with no deviation.
- Given a booked appointment, then it appears on the patient's upcoming list and the clinician's calendar from the same row.
- Given a patient with a booked appointment, when they try to book an overlapping time with another clinician, then 409.
- Given a cancellation, then the slot is bookable again and both calendars update.
- Given a patient and clinician in different time zones, then each sees the correct local time for the same instant, across a daylight-saving boundary in the test data.
- Given a slot in the past or outside availability, then the API rejects it.

### Scenario F: AI-supported progress review

Requirements

- Structured output: summary, reported changes, engagement observations, missing information, source references, items for clinician review.
- Every statement carries source references. The server verifies each reference resolves within the same patient and organisation. Unresolved or absent references mark the statement unsupported, and the UI shows the warning.
- Every generated block shows the draft label and the provider name. Output from the deterministic provider is never presented as model output.
- Actions: inspect evidence, edit, regenerate, approve, reject. Nothing is final without a human action. Edits are stored as a new version, and the original generation is kept.
- Generation requires the patient's active AI consent.
- Note assistance follows the same rules. An AI draft never becomes a signed note without the clinician signing it.

Acceptance criteria

- Given a generate request, then an `AIGeneration` row records provider, prompt version, input reference set, output, validity and cost fields.
- Given an output that fails schema validation, then the user sees a failure state with retry and no partial content is stored as a draft.
- Given a statement whose reference points to another patient, then it is flagged unsupported.
- Given an approve after an edit, then an `AIReview` row records reviewer, time and decision, and audit shows both the generation and the review.
- Given no AI consent, then generation returns a refusal with a reason and writes an audit event.
- Given source text containing an instruction-like string, then the output stays in schema and the instruction is not followed (the injection set).
- Given a provider timeout, then bounded retries run and the final state is a recoverable error.
- The assistant refuses diagnosis, treatment and exercise-change questions and points to messaging the care team.

### Scenario G: FHIR export

Requirements

- Mappings: Patient, Practitioner, Organization, CarePlan, Observation, Condition, Goal, Appointment, Encounter, DocumentReference. Consent is included where captured.
- Export is a `collection` Bundle with unique, unversioned fullUrls.
- Validation is the three defined layers. The PRD states plainly that the official HL7 validator was not run unless a logged run exists.
- Only signed notes are exported. Drafts, AI text, credentials and message bodies are not.
- Export is permitted to clinic admin for the organisation, to a clinician for the organisation's patients, and to a patient for their own record. Every export is audited.
- Import: validation, itemised errors as OperationOutcome, duplicate detection, organisation scoping, one transaction. Admin only.

Acceptance criteria

- Given an export, then the Bundle has zero dangling references, zero references outside the organisation, and every entry passes base validation.
- Given each of the ten mappers, then a round-trip test preserves the mapped fields.
- Given a fixture set of deliberately broken resources, then each is rejected with an issue that names the failing path.
- Given an import of a Bundle already imported, then duplicates are reported and no rows are added.
- Given a committed Synthea fixture bundle, then import succeeds for allow-listed types and reports each skipped type with a count.
- Given an unauthorised role, then export returns 403, or 404 across organisations.
- A failed import changes no rows.

### Scenario H: Administrative operations

Requirements

- Enrollment list, clinician assignment, availability editing, appointment operations, organisation settings, a read-only role matrix, audit viewer.
- Metrics: enrollment completion, appointment utilisation, cancellations, care plan activation, activity completion, pending review items. Each has a written definition with numerator, denominator and time window.
- Metrics are computed from persisted rows on request. No constants.
- Coordinator and admin permissions differ as the matrix states.

Acceptance criteria

- Given an assignment, then the patient appears in that clinician's list and the care-team card on the patient side names them.
- Given an availability change, then the patient's open slots change accordingly and existing bookings are untouched.
- Given the seed, then each metric from the endpoint equals an independent SQL count in the test.
- Given a new cancellation, then the cancellation metric changes on the next load.
- Given a coordinator, then role management and audit inspection are refused.
- Each of these actions writes an audit event visible in the audit viewer.

### Scenario I: Access-control failure

Requirements

- Every protected route enforces authentication, role and organisation scope on the server.
- A cross-organisation lookup returns 404 with no detail about whether the record exists. A same-organisation role violation returns 403.
- Both write a security event with actor, route template, resource type and id, and outcome. No request body or patient content is logged.
- Patients can reach only their own records.
- Audit rows cannot be updated or deleted.

Acceptance criteria

- Given a session in organisation B, when it requests each patient-scoped route with an organisation A identifier, then every response is 404 and each attempt has a security event. The test enumerates routes from the OpenAPI document so new routes are covered.
- Given patient 1, when they request patient 2's record in the same organisation, then 404 and a security event.
- Given no session, then 401.
- Given an UPDATE or DELETE on the audit table, then the database rejects it.
- Given the admin audit viewer, then the denied attempt is listed with its actor and time.
- The response body for 404 is identical for "does not exist" and "exists in another organisation".

## 4. Fixed copy the PRD must specify

| String | Where |
|---|---|
| "Demonstration product. Synthetic data. Not for clinical use." | Every app shell |
| "Not monitored for emergencies." with the emergency instruction | Message composer, assistant, pain contact notice |
| "Draft, generated, not reviewed" with the provider name | Every generated block |
| "Patient-reported" | Pain and symptom charts and tables |
| "Your therapist will see this" | After a pain report or check-in |
| "Set by your care team" | Prescribed fields the patient cannot change |
| Fictional and not medically reviewed notice | Exercise content |
| LOINC notice | About page |

## 5. What I will reject at review

- A requirement with no testable criterion, or a criterion no planned test covers.
- Any Core feature outside plan §1 and revision 1, or a Cut feature described as built.
- A persona, quote, number or outcome presented as research.
- A banned claim from plan §6.
- A metric without a definition.
- A state model that allows editing a published plan version, a signed note or an audit row.
- An AI path where content reaches a patient or a record without a human action.
