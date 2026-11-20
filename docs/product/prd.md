# CarePath Product Requirements Document

Date: 2026-11-19. Owner: product. Status: draft for advisor review.
Authority: `docs/decisions/advisor-plan-rev1.md` (rev1), then `advisor-plan.md` (plan), then `docs/BRIEF.md` (brief). Departures from the brief are in section 18.

Short names: CA competitor-analysis, MP mobbin-patterns (MP §N is pattern N; "MP principle N" is its section 3), HD healthcare-domain, JM job-market-alignment, PO product-opportunities, TP tooling-probe. Rationale tags follow PO: **[Observed]**, **[Standards]**, **[Assumption]**.

## 1. Summary

CarePath is a demonstration rehabilitation and remote care product. Patients follow exercise plans from their physical therapist, report pain, book visits and message their care team. Therapists review progress, publish versioned plans, work an explained review queue and write notes with optional evidence-linked AI drafts. Coordinators and clinic administrators run enrollment, assignment, availability, metrics and audit.

The product exists to prove Scenarios A to I with persisted data, automated tests and honest labels. It is a portfolio product using synthetic data only, unaffiliated with any company and not for clinical use. Every shell shows "Demonstration product. Synthetic data. Not for clinical use."

## 2. Problem and opportunity

No patient, clinician or administrator was interviewed. Each problem is inferred from public material (PO, How strong the evidence is).

| # | Opportunity | Evidence label | Scenario |
|---|---|---|---|
| O1 | Evidence-linked AI progress review with clinician approval | Observed pattern elsewhere (CA §5.1, §3.1); absence gap for progress review; hiring signal (JM) | F |
| O2 | "Why did my plan change?" note and diff for patients | Absence gap, assumption (CA Gaps 1). Weakest evidence; a design hypothesis | B |
| O3 | Pain report with a visible handoff and an explained queue item | Observed gap (MP §8); observed competitor pattern (CA §2.1, §2.2) | C, D |
| O4 | Guided exercise without camera, drag or fixed small text | Observed complaints, unverified reviews (CA §1.2); standards-driven (HD §8) | C |
| O5 | Consent the patient can see, change, and the system enforces | Absence gap (CA Gaps 6); standards-driven (HD §2.2) | A, F |
| O6 | Always clear who or what is speaking | Observed gap (CA Avoid 2, MP §12) | E |
| O7 | Three roles on one persisted, FHIR-aligned record | Absence gap (CA Gaps 3); hiring signal | B, C, G, H |
| O8 | Isolation and audit as visible behaviour | Observed pattern (CA §6.1); standards-driven (HD §2.3); hiring signal | I |
| O9 | Booking that cannot double-book and recovers politely | Observed pattern (CA §4.1, MP §10); design inference (MP principle 9) | E |

O1 to O4 are the core story; O5 to O9 are supporting proof.

## 3. Goals and non-goals

Each goal is met when its scenario's criteria (section 8) pass in `pnpm verify`.

- G-A A patient enrolls, consents and becomes assignable without re-entering data.
- G-B A clinician publishes an immutable plan version the patient sees and understands.
- G-C A patient completes, pauses, skips or stops a session by tap or keyboard; both roles see the same numbers.
- G-D A rule-matching check-in produces exactly one explained review task.
- G-E Booking never double-books and both calendars agree.
- G-F An AI summary reaches the record only after a clinician inspects evidence and approves.
- G-G A record exports as a Bundle passing CarePath's three validation layers.
- G-H Admin operations change real rows; metrics are computed from them.
- G-I Cross-organisation and cross-patient access is denied, indistinguishable and audited.

Non-goals: diagnosis; treatment recommendation; billing; real patients; compliance certification; live EHR integration; third-party app launch.

## 4. Users and roles

Roles: `patient`, `physical_therapist`, `care_coordinator`, `clinic_admin`, held per organisation, plus a `system` actor for jobs (rev1 §1, HD §1.2). No coach role. Coordinator and admin share one shell with different permissions.

### 4.1 Personas

**Assumption-based, not from research participants.** Design hypotheses only; no quotes or outcome data.

| Persona | Role | Assumed context | Design pressure |
|---|---|---|---|
| P1 Returning walker | Patient | Older adult after knee surgery, large system text, low app confidence, no equipment | Large targets, text scaling, no camera, plain words |
| P2 Desk worker | Patient | Recurring low-back pain, phone-first, short sessions | Resume after interruption, fast pain log |
| T1 Caseload therapist | Therapist | Many patients, keyboard-heavy desktop use | Explained queue, dense tables, fast evidence checks |
| C1 Coordinator | Coordinator | Enrollment and scheduling | Enrollment states, availability, conflicts |
| A1 Administrator | Admin | Settings, rules, metrics, audit | Definitions, audit filters |

### 4.2 Jobs to be done

- Patient: know what to do today; stop if it hurts; report and know someone will see it; book or move a visit; understand plan changes; control optional data uses.
- Therapist: see who needs attention and why; build and revise plans; check summaries against sources; document visits; never sign unread content.
- Coordinator: move new patients to a clinician; keep calendars right; message about logistics.
- Admin: configure rules and settings; read defined metrics; answer "who saw this record?".

### 4.3 Information architecture

- **Patient** (bottom tab bar, four text tabs, plan §4): Today, Progress, Appointments, Messages (assistant is a separate labelled entry). Account menu: profile, Sharing and consent, About, sign out. "Contact care team" sits in the same header position on every screen.
- **Therapist** (left rail): Overview, Schedule, Patients, Review queue, Messages (DR-002 H). The record is two-pane with a persistent header and sections: overview, timeline, plan, outcomes, activity, appointments, messages, notes, AI summaries, record history.
- **Coordinator and admin** (shared shell): Enrollment, Assignments, Availability, Appointments, Messages (coordinator), Metrics; admin only: Settings (organisation, review rules, clinic phone, reply-time text), Roles (read-only), Audit, FHIR import.

## 5. Permission matrix

From HD §2.4 as amended by rev1: clinicians read any patient in their organisation and write only for care-team patients; every record open is audited; no break-glass. Every check also enforces organisation equality; deny by default.

| Resource | patient | physical_therapist | care_coordinator | clinic_admin |
|---|---|---|---|---|
| Demographics | r, u limited (own) | r (org) | r, u admin fields (org) | r admin fields |
| Intake, Condition, Goal | r (own) | r org; c, u care team | completeness only | completeness only |
| CarePlan, versions | r own published | r org; c, u, publish care team | status only | status only |
| Session, check-in, Observation | c, r (own) | r (org) | counts only | aggregates only |
| ClinicalNote | none | r org; draft and sign as author on care team | none | none |
| AI generation, review | none | r org; generate, review care team | none | none |
| ReviewTask | none | r org; assign, resolve care team | r; resolve administrative rules | r; configure rules |
| Appointment, availability | c, r, cancel (own) | r; own availability | c, r, u, cancel (org) | r, configure |
| Messaging | own threads | care-team threads | org threads | none |
| Consent | c, r, revoke optional (own) | r | r | r |
| AuditEvent | none | none | none | r |
| FHIR export / import | export own | export org patients | none | export org; import |
| Users, roles | none | none | none | read-only matrix |

Amendments: HD scopes coordinators to a caseload, but no such model exists, so they read administrative fields organisation-wide (Q2). The record's "record history" is built from domain rows, not AuditEvent, which stays admin-only (HD §2.3).

## 6. Care lifecycle

| Step | Actor | What happens | Scenario |
|---|---|---|---|
| Enrollment and intake | Patient | Account, code, intake, consent; status "awaiting assignment" | A |
| Assignment | Coordinator, admin | Clinician added to care team | H |
| Assessment | Therapist | Visit booked and completed; Encounter, Condition, Goal, signed note | E, F |
| Plan | Therapist | Draft, preview, publish version 1 | B |
| Guided exercise | Patient | Session against the current version | C |
| Progress tracking | Patient, system | Check-ins, Observations, weekly progress | C |
| Review | System, therapist | Rules create tasks; AI summary drafted, inspected, approved | D, F |
| Follow-up | Therapist, patient | Version 2 with change note; follow-up booked | B, E |
| Throughout | Admin, system | Metrics, audit, export, denial of out-of-scope access | G, H, I |

## 7. Functional requirements

Columns: ID, requirement, role (P patient, T therapist, C coordinator, A admin, S system), tier and priority, acceptance, source. Must and Should are Core; Could is Stretch and starts only after checkpoint C3. Cut items appear only in section 17. AC IDs refer to section 8.

### 7.1 Onboarding

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-ONB-01 | Brief §4 steps in order with back navigation and "Step n of 11" | P | Core-Must | PW walks forward and back, asserts indicator | Brief §4, MP §2 |
| REQ-ONB-02 | Server autosave per step; resume at first incomplete step on any device | P | Core-Must | AC-A1 | Brief §4 |
| REQ-ONB-03 | Errors tied to fields and announced; paste and password managers work; pasteable eligibility code | P | Core-Must | AC-A6 | Rev1, HD §8 [Standards] |
| REQ-ONB-04 | No stored answer asked twice, including in booking | P | Core-Must | AC-A7 | Rev1 (3.3.7) [Standards] |
| REQ-ONB-05 | Required and optional consent separate and worded; optional off; says where to change | P | Core-Must | AC-A8 | MP §4 [Observed] |
| REQ-ONB-06 | No onboarding output states or implies a diagnosis | P | Core-Must | AC-A9 | Brief §4 |
| REQ-ONB-07 | Invalid or reused eligibility code rejected | P | Core-Must | AC-A3 | Brief §4 |

### 7.2 Today

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-TOD-01 | One primary "Start today's session", then a plain list: check-in, next appointment, messages, weekly progress, reminders | P | Core-Must | PW asserts one primary button and order | Plan §4, CA Adopt 1 [Observed] |
| REQ-TOD-02 | Plan-change explanation shown until dismissed | P | Core-Must | AC-B3 | CA Gaps 1 [Assumption] |
| REQ-TOD-03 | Empty states say why and offer one action | P | Core-Should | PW on seeded patient with no plan | MP §20 [Observed] |
| REQ-TOD-04 | In-app session and appointment reminders produced by jobs | S | Core-Should | Job test: one reminder per due item, retried on failure | Rev1 §3 |

### 7.3 Session, check-in and progress

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-SES-01 | Overview, instructions, illustration, dose, rest timer, pause, resume, skip with reason, "Stop, this hurts", completion, check-in | P | Core-Must | AC-C1, AC-C3, AC-C4 | Brief §4, MP §7 |
| REQ-SES-02 | Keyboard and single-tap operable; no camera | P | Core-Must | AC-C5 | CA §1.2, HD §8 [Observed, Standards] |
| REQ-SES-03 | State persisted per step; session records its plan version | S | Core-Must | AC-C1, AC-B5 | Plan ADR-10 |
| REQ-SES-04 | Fictional-content notice on exercise content | P | Core-Must | PW text assertion | Plan §6 |
| REQ-SES-05 | Optional camera rep counting behind a flag, manual fallback | P | Stretch-Could | Plan WP 9.1 gate | Brief §4 |
| REQ-CHK-01 | Pain is the 0 to 10 radio group in `packages/ui`; no slider. Anchors read "0 No pain" and "10 Worst pain imaginable" (LOINC 72514-3 wording; not clinically reviewed, open sign-off S1) | P | Core-Must | Unit: arrow keys move selection | Rev1, HD §8 (2.5.7) [Standards] |
| REQ-CHK-02 | "Your therapist will see this" after submission | P | Core-Must | AC-C6 | MP §8 [Observed] |
| REQ-CHK-03 | Contact-your-clinic notice at the pain threshold | P | Core-Must | AC-D7 | PO 3 |
| REQ-CHK-04 | Each pain report stores an Observation, LOINC 72514-3, performer Patient | S | Core-Must | AC-C2, AC-G2 | HD §3.3 [Standards] |
| REQ-PRG-01 | Sessions, assigned versus completed, weekly engagement, pain, goals, milestones, appointment history | P | Core-Must | AC-C2 | Brief §4 |
| REQ-PRG-02 | "Patient-reported" labels; no improvement captions; table for every chart | P, T | Core-Must | AC-C7 | Brief §4, MP principle 5 |

### 7.4 Appointments and messaging

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-APT-01 | Profiles, types, slots from persisted availability, confirm, reschedule, cancel | P | Core-Must | AC-E2, AC-E4 | Brief §4 |
| REQ-APT-02 | Server availability check; exclusion constraints for practitioner and patient | S | Core-Must | AC-E1, AC-E3, AC-E6 | Plan ADR-9, PO 9 |
| REQ-APT-03 | Instants are stored in UTC. Every time is shown in the clinic's zone with the zone named. For a video visit, the viewer's local time is added when the browser zone differs | All | Core-Must | AC-E5 | Plan ADR-9 |
| REQ-APT-04 | Atomic reschedule | P, C | Core-Must | AC-E7 | Brief §4 |
| REQ-APT-05 | On conflict, nearby slots offered and selections kept | P | Core-Must | AC-E8 | MP principle 9 [Assumption] |
| REQ-APT-06 | Check in and complete a visit; completion creates an Encounter | T | Core-Should | API: Encounter only for completed visits | HD §3.1 [Standards] |
| REQ-MSG-01 | Threads, history, composer, unread, sent and failed with retry | P, T, C | Core-Must | AC-E9 | Brief §4 |
| REQ-MSG-02 | Sender name and role; reply time from settings; emergency notice in composer | P | Core-Must | AC-E10 | CA Avoid 2, MP §12 [Observed] |
| REQ-MSG-03 | Participants only | All | Core-Must | AC-E11 | HD §2.4 |

### 7.5 Navigation assistant

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-AST-01 | Separate, labelled automated screen answering from approved help content and the patient's own plan, appointments and progress | P | Core-Must | Eval: the brief's four example questions each link to the right screen | Brief §6, PO 6 |
| REQ-AST-02 | Refuses clinical questions and links to messaging; shows the emergency notice | P | Core-Must | AC-F9; PW text assertion | Brief §6 |

### 7.6 Clinician workspace

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-OVR-01 | Overview work lists with counts (appointments, open tasks, unreviewed check-ins, missed activity, unanswered messages, AI drafts, recent publishes); no KPI tiles | T | Core-Must | API: each count equals its list length | Plan §4 |
| REQ-DIR-01 | Directory with server-side search, sort, pagination (max 100) and filters: status, clinician, last activity, upcoming appointment, plan stage, open review | T | Core-Must | API test per filter and sort against SQL | Brief §5, MP §14-15 |
| REQ-DIR-02 | Saved filters | T | Stretch-Could | API round trip | Plan §1 |
| REQ-REC-01 | Record with persistent header and the sections in 4.3, including a time-ordered timeline | T | Core-Must | API: timeline equals union of source rows; PW header stays visible | Brief §5 |
| REQ-REC-02 | Every record open audited | S | Core-Must | AC-I7 | Rev1 access rule |
| REQ-REC-03 | Writes refused for clinicians outside the care team | T | Core-Must | AC-B6 | Rev1 access rule |

### 7.7 Plan builder

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-PLN-01 | Library search and filter; reps, sets or duration; weekly schedule; goals; instructions | T | Core-Must | API per field; PW Scenario B | Brief §5 |
| REQ-PLN-02 | Reorder by move up and move down buttons | T | Core-Must | AC-B8 | Rev1 (2.5.7) |
| REQ-PLN-03 | Draft, publish, immutable versions, history | T | Core-Must | AC-B1, AC-B2, AC-B7 | Plan ADR-10 |
| REQ-PLN-04 | Version 2 onward needs a patient-facing note; diff computed | T | Core-Must | AC-B3, AC-B4 | Rev1 §1, CA Gaps 1 |
| REQ-PLN-05 | Patient-view preview before publish | T | Core-Must | PW: preview matches patient rendering of the draft | MP §7 |
| REQ-PLN-06 | "Set by your care team" on prescribed fields | P | Core-Should | PW text assertion | MP principle 7 |

### 7.8 Review queue and notes

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-RVQ-01 | Rules stored as data, admin-editable (section 10) | A | Core-Must | AC-D4 | Brief §5 |
| REQ-RVQ-02 | Task shows rule, value, threshold, time, source link | T | Core-Must | AC-D1 | PO 3 |
| REQ-RVQ-03 | Assign, resolve with note; one open task per rule and source | T, C | Core-Must | AC-D2, AC-D5 | Brief §5 |
| REQ-RVQ-04 | Described as rule-based; no score | T | Core-Must | PW text assertion; docs linter | Plan §6 |
| REQ-RVQ-05 | Empty state "Nothing needs attention" with last-checked time | T | Core-Must | AC-D6 | MP §20 |
| REQ-NOT-01 | SOAP template, autosaved draft, resume | T | Core-Must | API: draft survives logout | Brief §5 |
| REQ-NOT-02 | Author on care team signs; signed content immutable; amendments are new versions with history | T | Core-Must | DB: UPDATE of signed content rejected; amendment links prior | Rev1 §1 |

### 7.9 AI

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-AIS-01 | Structured progress summary (section 11) | T | Core-Must | AC-F1, AC-F2 | Brief §6 |
| REQ-AIS-02 | Evidence verifier flags unsupported statements | S | Core-Must | AC-F3 | Plan ADR-6, PO 1 |
| REQ-AIS-03 | Draft label and provider name on every block | T | Core-Must | AC-F10 | Plan §4 |
| REQ-AIS-04 | Inspect, edit, regenerate, approve, reject; edits versioned | T | Core-Must | AC-F4 | MP §18 |
| REQ-AIS-05 | Active AI consent required | S | Core-Must | AC-F5 | Rev1 §1 |
| REQ-AIS-06 | Note draft from a synthetic transcript under the same rules | T | Core-Must | AC-F8 | Brief §6 |
| REQ-AIS-07 | Resilience: injection set, bounded retries | S | Core-Must | AC-F6, AC-F7 | Plan ADR-6 |
| REQ-AIS-08 | Live model run with a real key | T | Stretch-Could | Eval report names provider and run | Plan §1 |

### 7.10 Administration

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-ADM-01 | Enrollment list with status and missing-intake state | C, A | Core-Must | AC-A2, AC-A4 | Brief §7 |
| REQ-ADM-02 | Clinician assignment | C, A | Core-Must | AC-H1 | Brief §7 |
| REQ-ADM-03 | Availability editing | C, A | Core-Must | AC-H2 | Brief §7 |
| REQ-ADM-04 | Appointment operations for org patients | C | Core-Must | AC-E4, AC-E7 | Brief §7 |
| REQ-ADM-05 | Settings: name, time zone, clinic phone, reply-time text, thresholds | A | Core-Must | AC-D4, AC-H6 | Brief §7 |
| REQ-ADM-06 | Six defined metrics computed on request | C, A | Core-Must | AC-H3, AC-H4 | Brief §7 |
| REQ-ADM-07 | Read-only role matrix generated from the policy table | A | Core-Must | Unit: rendered matrix equals policy table | Plan §1 |
| REQ-ADM-08 | Coordinator refused role management and audit | C | Core-Must | AC-H5 | Rev1 §1 |
| REQ-ADM-09 | Editable roles | A | Stretch-Could | API test | Plan §1 |

### 7.11 FHIR, audit and consent

| ID | Requirement | Role | Tier | Acceptance | Source |
|---|---|---|---|---|---|
| REQ-FHR-01 | Ten mappers plus Consent (section 12) | S | Core-Must | AC-G2 | HD §4 |
| REQ-FHR-02 | `collection` export, signed notes only, permitted roles only | A, T, P | Core-Must | AC-G1, AC-G6, AC-G8 | HD §5 |
| REQ-FHR-03 | Three validation layers | S | Core-Must | AC-G1, AC-G3 | Rev1 §1 |
| REQ-FHR-04 | Admin import: errors, duplicates, one transaction | A | Core-Must | AC-G3, AC-G4, AC-G7 | HD §6.2 |
| REQ-FHR-05 | `pnpm synthea:demo` and three committed fixtures | A | Core-Must | AC-G5 | Rev1 |
| REQ-FHR-06 | Sandbox push | A | Stretch-Could | Logged push result | Rev1 §2 |
| REQ-AUD-01 | Authentication, role and organisation scope on every protected route | S | Core-Must | AC-I1, AC-I3 | Plan ADR-8 |
| REQ-AUD-02 | Identical 404 and a security event for out-of-scope lookups | S | Core-Must | AC-I1, AC-I2, AC-I6 | HD §10 |
| REQ-AUD-03 | Audit rows reject UPDATE and DELETE by trigger | S | Core-Must | AC-I4 | Rev1 §1, HD §2.3 |
| REQ-AUD-04 | Audit viewer filters by actor, patient, event type, date | A | Core-Must | AC-I5, AC-H6 | PO 8 |
| REQ-AUD-05 | Audit hash chain | S | Stretch-Could | Tamper test | Rev1 §1 |
| REQ-CON-01 | "Sharing and consent" shows each choice and when it changed; optional AI consent revocable and audited | P | Core-Must | API: revoke then AC-F5 refusal; audit row | Rev1 §1, MP §4 |

## 8. Scenario acceptance criteria

Outline minimums, unweakened, plus additions. Each maps to tests in section 20.

**A. New patient enrollment**
- AC-A1 Given a patient who leaves at step 5, when they sign in again, then they land on step 5 with steps 1 to 4 intact.
- AC-A2 Given completed onboarding, then status is "awaiting assignment", an active required consent row holds the consent text version, and the patient appears in the admin enrollment list on the normal refetch.
- AC-A3 Given an invalid or reused eligibility code, then 4xx with the standard error shape and no account.
- AC-A4 Given incomplete intake, then the patient cannot be marked ready and "Missing intake information" is visible to staff.
- AC-A5 Audit contains account creation and consent capture.
- AC-A6 Given an invalid field, then its error is programmatically linked and in a live region; credential fields allow paste; axe has no serious or critical findings.
- AC-A7 Given stored availability, then booking pre-fills it.
- AC-A8 Given the consent step, then optional AI is off by default and the text names "Sharing and consent".
- AC-A9 Given the review step, then a copy test finds no term from the banned diagnostic list.

**B. Clinician assigns a treatment plan**
- AC-B1 Given a draft, then the patient API returns no trace of it.
- AC-B2 Given a publish, when the patient next loads Today, then the new version is shown and a later session references it.
- AC-B3 Given version 2, then the patient sees the note, the computed added, removed and changed exercises, the clinician's name and the date.
- AC-B4 Given version 2 without a change note, then a validation error.
- AC-B5 Given a session in progress on version 1 when version 2 publishes, then it completes against version 1 and history shows that.
- AC-B6 Given a same-organisation clinician off the care team, then a write is 403 and audited; another organisation gets 404 and a security event.
- AC-B7 Version history lists every version with author and time; no version can be edited.
- AC-B8 Reordering works by keyboard with move buttons; no drag handler exists.

**C. Exercise completion**
- AC-C1 Given interruption at exercise 3 of 5, when the patient returns, then the session resumes at exercise 3 with prior steps recorded.
- AC-C2 Given a completed session and check-in, then patient weekly progress and clinician activity history show the same counts and pain, read from the same rows.
- AC-C3 Given a skip, then it is stored as skipped with its reason and not counted as completed.
- AC-C4 Given "Stop, this hurts", then the session ends as stopped, a pain report is requested, and the clinician sees it was stopped for discomfort.
- AC-C5 The Playwright run at 390 by 844 completes one full pass by keyboard only; axe has no serious or critical findings.
- AC-C6 Given a submitted check-in, then "Your therapist will see this" is shown.
- AC-C7 Pain views are labelled "Patient-reported", every chart has a table with equal values, and no caption contains "improve".

**D. Patient requires review**
- AC-D1 Given pain at the threshold, then exactly one task exists, its payload carries rule, value and threshold, and its link opens the check-in.
- AC-D2 Given the same check-in processed twice, then still one task.
- AC-D3 Given pain one below the threshold, then no pain task.
- AC-D4 Given an admin threshold change, then later check-ins use it and the change is audited.
- AC-D5 Given a resolved task, then it leaves the open queue, keeps its history, and records resolver and time.
- AC-D6 An empty queue shows its empty state, not a blank table.
- AC-D7 Given pain at the threshold, then the patient sees the contact notice with clinic phone and emergency line, with no banned diagnostic term.

**E. Appointment booking**
- AC-E1 Given 50 parallel requests for one slot, then exactly one succeeds and 49 receive 409, repeated 20 times with no deviation.
- AC-E2 Given a booking, then the patient's list and the clinician's calendar show it from the same row.
- AC-E3 Given an overlapping booking by the same patient with another clinician, then 409.
- AC-E4 Given a cancellation, then the slot is bookable again and both calendars update.
- AC-E5 Given the same instant, then every viewer sees the clinic-zone time with the zone named, across a daylight-saving boundary in test data; for a video visit viewed from another zone, the viewer's local time is also shown.
- AC-E6 Given a past slot or one outside availability, then rejection.
- AC-E7 Given a reschedule whose new slot is taken, then the original booking is unchanged.
- AC-E8 Given a 409 in the UI, then nearby slots are offered and type and clinician selections are kept.
- AC-E9 Given a send failure, then a failed state with retry; opening a thread clears its unread count.
- AC-E10 Every message shows sender name and role; the patient composer shows reply time and the emergency notice ("Not monitored for emergencies. If this is an emergency, call 911."). The staff composer shows no emergency notice; it shows the reply-time line the patient was given.
- AC-E11 Given a non-participant, then reading a thread returns 404.

**F. AI-supported progress review**
- AC-F1 Given a generate request, then an `AIGeneration` row records provider, prompt version, input references, output, validity and cost fields.
- AC-F2 Given schema-invalid output, then a failure state with retry and no stored partial draft.
- AC-F3 Given a reference to another patient, then the statement is unsupported.
- AC-F4 Given approve after edit, then an `AIReview` row records reviewer, time and decision, the original generation is kept, and audit shows both.
- AC-F5 Given no AI consent, then a refusal with a reason and an audit event.
- AC-F6 Given source text with an instruction-like string, then output stays in schema and the instruction is not followed.
- AC-F7 Given a provider timeout, then bounded retries and a recoverable error.
- AC-F8 Given an AI note draft, then no signed note exists until the clinician signs.
- AC-F9 The assistant refuses diagnosis, treatment and exercise-change questions and points to messaging.
- AC-F10 Every generated block shows "Draft, generated, not reviewed" and the provider; deterministic output says "Demo provider, rule-based".

**G. FHIR export**
- AC-G1 Given an export, then zero dangling references, zero references outside the organisation, and every entry passes base validation.
- AC-G2 Each of the ten mappers round-trips its mapped fields.
- AC-G3 Each broken fixture is rejected with an issue naming the failing path.
- AC-G4 Given a re-import, then duplicates are reported and no rows added.
- AC-G5 Given a committed Synthea fixture, then allow-listed types import and each skipped type is reported with a count.
- AC-G6 Given an unauthorised role, then 403, or 404 across organisations.
- AC-G7 A failed import changes no rows.
- AC-G8 Given a draft note, AI text and messages, then the Bundle contains none of them and no credential fields.

**H. Administrative operations**
- AC-H1 Given an assignment, then the patient is in the clinician's list and the patient's care-team card names them.
- AC-H2 Given an availability change, then open slots change and existing bookings are untouched.
- AC-H3 On the seed, each metric equals an independent SQL count.
- AC-H4 Given a new cancellation, then the cancellation metric changes on next load.
- AC-H5 Given a coordinator, then role management and audit inspection are refused.
- AC-H6 Each action writes an audit event visible in the viewer.

**I. Access-control failure**
- AC-I1 Given an organisation B session calling every patient-scoped route (enumerated from OpenAPI) with an organisation A id, then each response is 404 with a security event.
- AC-I2 Given patient 1 requesting patient 2's record, then 404 and a security event.
- AC-I3 Given no session, then 401.
- AC-I4 Given UPDATE or DELETE on the audit table, then the database rejects it.
- AC-I5 The viewer lists the denied attempt with actor and time.
- AC-I6 The 404 body is identical for "does not exist" and "exists in another organisation".
- AC-I7 Opening a record writes `phi.read`; security events hold actor, route template, resource type and id, and outcome, but no body or patient content.

## 9. State models

Unlisted transitions are rejected by the service; immutability is also enforced by database checks.

| Model | Allowed transitions | Triggered by |
|---|---|---|
| Onboarding | `not_started → in_progress(step) → submitted` | Patient |
| Patient status | `intake_incomplete → awaiting_assignment → assigned → active → inactive`; `inactive → assigned` | System, coordinator or admin, system on first publish, admin |
| CarePlan | `draft → active → completed` or `revoked` | Care-team therapist |
| CarePlanVersion | `draft → published → superseded`; published content immutable; one draft per plan | Therapist; system supersedes |
| ExerciseSession | `in_progress ⇄ paused`; `in_progress → completed`, `stopped_discomfort`, `abandoned`; items `pending → done` or `skipped` | Patient; system abandons after 24 idle hours [Assumption] |
| Appointment | `booked → checked_in → completed` or `no_show`; `booked → cancelled_by_patient` or `cancelled_by_clinic`; reschedule inserts a linked `booked` row and cancels the old one in one transaction | Patient (own), coordinator (org), therapist (check-in, complete, no-show) |
| ClinicalNote version | `draft → signed`; signed immutable; amendment is a new draft version, prior superseded on signature | Author on care team |
| ReviewTask | `open → assigned → resolved`; `open → resolved`; note required | System creates; care-team therapist; coordinator for administrative rules |
| AIGeneration | `requested → succeeded`, `failed_schema`, `failed_provider`, `refused_no_consent` | Therapist; system |
| AI review | `draft → edited → approved` or `rejected`; regenerate creates a new generation | Care-team therapist |
| Consent | `active → inactive`; re-grant inserts a new row | Patient for optional types; required consent via the clinic (Q4) |
| AuditEvent | Insert only | System |

## 10. Review rules and metrics

Rules are administrative thresholds set by the clinic. They are unvalidated, predict nothing, and their defaults are arbitrary demo values (PO 3). Only clinic admins change them; each change is audited. Pain is evaluated on submission; time-based rules run as Postgres jobs. A partial unique index keeps one open task per rule and source.

| Rule | Trigger | Default | Explanation shown | Source record |
|---|---|---|---|---|
| Reported pain | Check-in pain ≥ threshold | 7 | "Reported pain {value} of 10. Clinic rule: {threshold} or higher." | Check-in |
| Missed sessions | Missed assigned sessions in 7 days ≥ threshold | 2 | "Missed {value} sessions in 7 days. Clinic rule: {threshold} or more." | Plan schedule |
| Unreviewed check-in | Not opened by care team within threshold hours | 48 | "Not reviewed for {value} hours. Clinic rule: {threshold}." | Check-in |
| Upcoming follow-up | Follow-up within threshold hours | 48 | "Follow-up in {value} hours. Clinic rule: within {threshold}." | Appointment |
| Missing intake | Intake incomplete threshold days after sign-up | 3 | "Intake incomplete for {value} days. Missing: {fields}." | Intake |

Metrics are organisation-scoped and computed from rows on request, in the organisation's time zone.

| Metric | Numerator | Denominator | Window |
|---|---|---|---|
| Enrollment completion | Onboardings `submitted` | Accounts created | Created in last 30 days |
| Appointment utilisation | Booked, checked-in or completed minutes | Published availability minutes | Last 30 days |
| Cancellations | Appointments cancelled | Appointments booked | Booked in last 30 days |
| Care plan activation | Patients with a published version | Patients `assigned` or `active` | Now |
| Activity completion | Items `done` | Items scheduled by published versions | Trailing 7 days |
| Pending review items | Open and assigned tasks by age band | Count, not a ratio | Now |

## 11. AI requirements

- **Labelling.** Provider stored on `AIGeneration` and rendered; the deterministic provider is "Demo provider, rule-based" (plan §6).
- **Output.** Summary, reported changes, engagement observations, missing information, source references, review items; Zod-validated; versioned prompts.
- **Evidence.** Each statement carries `sourceRefs`; the verifier resolves them within the same patient and organisation. States: supported, unsupported ("No supporting record found"), missing information. No numeric confidence (PO 1 limits).
- **Resilience.** Timeout target 20 seconds, two retries with backoff, then a recoverable error; AI routes rate limited.
- **Consent gate.** Active `ai_assisted_features` consent required; refusals audited.
- **Redaction.** Names, birth dates and contact fields tokenised before any external call; a canary test checks outbound payloads.
- **Injection.** Source text passed as delimited data; the injection set must stay in schema.
- **Assistant scope.** Navigation only; no patient data sent to an external provider in Core.
- **Human approval.** Nothing generated reaches a patient, the record or an export without a clinician action. Approved summaries are clinician-only (Q1).
- **Evaluation.** `pnpm ai:eval` runs 50 synthetic transcripts with expected facts, the injection set and assistant refusal cases, and writes schema-valid rate, unsupported-statement rate, fact recall and refusal accuracy, naming the provider.

## 12. Interoperability

- **Mappings:** Patient, Practitioner, Organization, CarePlan, Observation, Condition, Goal, Appointment, Encounter, DocumentReference; Consent where captured; PractitionerRole derived and Provenance generated at export (HD §4, rev1).
- **Bundles:** `collection` with unique, unversioned `urn:uuid` fullUrls (HD §5). Transaction bundles only for the Stretch sandbox push.
- **Validation:** (1) `@medplum/core` `validateResource` for base R4 structure and invariants; (2) CarePath checks for references, target types, organisation boundary, fullUrl uniqueness and required US Core elements; (3) duplicate detection. Medplum's coverage is unverified, so broken fixtures must fail.
- **Pin:** US Core 6.1.0 in one constant; differences from the later versions HD read are unverified. `meta.profile` is not written.
- **Codes:** LOINC 72514-3 for pain; local codes where no LOINC was verified (HD §3.3).
- **Official validator:** one 30-minute attempt from another host. Without a logged run, documents state "Official HL7 validation was not performed" (TP §4).
- **Import:** limits, allow-list, validation, reference graph, duplicates, dry-run report, one transaction, organisation scope, audit; errors as OperationOutcome with `expression` paths (HD §6.2); Synthea conditional references resolved.
- **Synthea:** `pnpm synthea:demo` imports a small seeded population; three fixtures committed with command and seed. "Synthea was run" appears only with a logged command, seed and count.
- **Wording:** "US Core-aligned shapes, validated by CarePath's defined checks". Not a FHIR server; no EHR integration.

## 13. Privacy and security

CarePath implements selected security controls (HD §10) and has not been assessed for compliance.

- **Sessions:** database sessions, HttpOnly SameSite=Lax cookie, scrypt, rotation on login, 30-minute idle and 12-hour absolute timeouts [Assumption], Origin check on mutations (plan ADR-7).
- **Isolation:** `ctx` on every route; repositories filter by organisation and patient; Prisma outside `repo.ts` fails lint (ADR-8).
- **Audit events:** `auth.login`, `auth.login_failed`, `auth.logout`, `account.create`, `consent.grant`, `consent.revoke`, `phi.read`, `careplan.publish`, `note.sign`, `ai.generate`, `ai.refused`, `ai.review`, `review_task.resolve`, `review_rule.update`, `appointment.book`, `appointment.cancel`, `assignment.create`, `availability.update`, `settings.update`, `export.fhir`, `import.fhir`, `security.access_denied`.
- **Logs:** request id, route template, status, actor and resource ids only; a canary test asserts seeded names and check-in text never appear (HD §2.1).
- **Rate limit targets:** login 10 per minute per account and IP; AI 10 per minute per user; export and import 5 per minute; booking 20 per minute per patient; 429 with Retry-After.
- **Not claimed:** regulatory compliance, certification, MFA, an authorisation server, encryption at rest in the demo, multi-instance rate limiting (ADR-4).

## 14. Accessibility

Target WCAG 2.2 AA. Specific criteria (rev1, HD §8): 2.5.7 (buttons for pain and reorder; no drag anywhere); 2.5.8 (24 px floor; 48 px patient and 32 px clinician house targets); 2.4.11 (`scroll-padding` for tab bar and sticky headers); 3.2.6 (fixed "Contact care team"); 3.3.7 (no re-asking); 3.3.8 (paste and password managers). Relative type units checked at 200 percent zoom (CA §1.2); status never by colour alone; reduced motion honoured.

Method: axe in every Playwright scenario with zero serious or critical findings; keyboard-only passes for A, B and C; 200 percent zoom screenshots at 390, 768 and 1440 px; a written manual checklist. Limits: Chromium only (TP §1); no screen reader, Safari or assistive-technology user testing is claimed. Reports read "automated checks passed; manual review covered" followed by the list.

## 15. Non-functional targets

All values are targets; nothing has been measured. Environment: two CPUs, 7 GB RAM, one instance, so results are small-machine numbers.

| Target | Value | Source |
|---|---|---|
| Functioning API endpoints | 30 or more | Brief §19 |
| End-to-end tests | 25 or more | Brief §19 |
| Core business-logic coverage | 80 percent | Brief §19 |
| FHIR mappings | 10 | Brief §19 |
| Conflicting bookings prevented | 100 percent in AC-E1 | Brief §19 |
| AI evaluation encounters | 50 | Brief §19 |
| Read latency at 20 virtual users | p50 under 50 ms, p95 under 200 ms | [Assumption] |
| Write latency at 20 virtual users | p95 under 400 ms | [Assumption] |
| Full seed | Under 3 minutes | Plan WP 6.3 |
| Patient Today first-load JavaScript | Under 250 KB gzip | [Assumption] |

`pnpm bench` uses k6, falls back to autocannon, and names the tool. Reported numbers come only from `docs/evaluation/metrics.json`.

## 16. Content and safety copy

| String | Where |
|---|---|
| "Demonstration product. Synthetic data. Not for clinical use." | Every app shell and public page |
| "Not monitored for emergencies. If this is an emergency, call 911." | Message composer, assistant, pain contact notice |
| "Draft, generated, not reviewed" with the provider name | Every generated block |
| "Patient-reported" | Pain and symptom charts and tables |
| "Your therapist will see this" | After a pain report or check-in |
| "Set by your care team" | Prescribed fields the patient cannot change |
| "These exercises are fictional and have not been medically reviewed. Do not use them as treatment instructions." | Exercise library, session overview, plan preview |
| "This material contains content from LOINC (http://loinc.org)." with LOINC version | About page |
| "You reported pain of {value} out of 10. If you are worried, contact your clinic at {phone}." | Pain contact notice, above the emergency line |
| "This assistant is automated. It answers questions about using CarePath, not medical questions." | Assistant header |

Banned diagnostic terms for the copy tests in AC-A9 and AC-D7: "diagnosis", "diagnosed", "you have", "you may have", "injury", "tear", "sprain", "condition is", "treatment for". The list lives in one shared constant.

## 17. Scope table

| Brief feature | Tier |
|---|---|
| Patient onboarding, Today, session, check-in, progress, appointments, messaging, assistant | Core |
| Clinician overview, directory, record, plan builder, review queue, SOAP notes | Core |
| AI summaries, note assistance, deterministic provider, evaluation | Core |
| Enrollment, assignment, availability, appointment operations, settings, metrics, audit viewer, read-only role matrix | Core |
| Ten FHIR mappings, export, validation, import, Synthea import demo | Core |
| Session auth, RBAC, isolation, audit, rate limits, Postgres jobs, OpenAPI, `/design-system` gallery | Core |
| Saved filters, live model run, sandbox push, PWA polish beyond manifest and app-shell worker, landing page art, Storybook, editable roles, row-level security, audit hash chain, motion tracking | Stretch |
| Coach role, push notifications, WebSockets, Python AI service, Redis, BullMQ, Turborepo, three frontends, OAuth and app launch, MFA, break-glass, extra consent types, photo attachments, AI draft replies, queue snooze, offline-first sessions, billing | Cut |
| Usability testing | Method and scenarios only |
| Docker Compose, deployment | Written; unverified unless a run is logged |

## 18. Revisions to the brief

Rows 1 to 11 are rev1 §3; the rest follow from the plan.

| Brief | Revision | Reason |
|---|---|---|
| §11 models | Adds `Condition` | §12 requires the mapping and §11 has no source for it |
| §12, Scenario G "valid FHIR Bundle" | Valid means passing the three layers | The official validator cannot fetch packages here |
| §12 Synthea | Feeds the import demo, not the main seed | No rehab entities in Synthea; gate independence |
| §1, §3 roles | Four roles in three shells; no coach | Research found no distinct coach workflow |
| §4 pain reporting | Buttons, never drag-only | WCAG 2.5.7 |
| §5 plan builder | A revision needs a patient-facing note | Makes "the patient application must reflect the changes" legible |
| §5 review queue | Patient sees a handoff and contact notice | A logged symptom should end somewhere visible |
| §6 AI | Needs active AI consent; only signed notes are exported | Consent must be enforced to mean anything; drafts are not records |
| §2, §14 SMART and OAuth | Researched, not implemented | First-party client only (rev1 §2) |
| §16 accessibility | Chromium only, manual scope stated | TP §1 |
| §4 reminders | In-app, produced by jobs | No delivery channel in the demo |
| §5 record audit history | Record history from domain rows; AuditEvent admin-only | HD §2.3 |
| §7 role management | Read-only matrix; editing Stretch | Plan §1 |
| §8, §10 Storybook and stack | Gallery route; one Next.js app, Fastify, TypeScript AI, Postgres jobs, polling | Plan §1, ADR-1 to ADR-5, ADR-12 |
| §4 motion tracking | Stretch | Plan §1 |

### Revisions (design checkpoint D1)

Dated 2026-11-20. Source: `docs/design/decision-records/DR-002-feature-decisions.md` (DR-002). The shared `URGENT_NOTICE` constant is added by D-WP-3, not here.

| Item | Revision | Source |
|---|---|---|
| REQ-APT-03 | UTC storage; times shown in the clinic zone with the zone named; viewer's local time added for video visits when the zone differs | DR-002 F, CD-314 |
| AC-E5 | Keeps the daylight-saving test; adds the video-visit case | DR-002 F |
| AC-E10 | Clarified to the patient composer; staff composer has no emergency notice and shows the reply-time line | DR-002 G, CD-511 |
| REQ-CHK-01 | Pain anchors "0 No pain" and "10 Worst pain imaginable"; live line "You chose 7 of 10." with no band word | DR-002 D |
| Section 4 therapist navigation | Order is Overview, Schedule, Patients, Review queue, Messages; both inboxes carry a count badge | DR-002 H, CD-501 |
| Section 5 browser storage | No `localStorage`; `sessionStorage` for interface state only; no patient identifiers in URLs or titles; free-text drafts held in memory with a leave guard (R1, R2) | DR-002 R1, R2 |
| Withdrawn | "Draft restored after a reload" for messages | DR-002 G |
| Rejected change requests | Eligibility pre-check, email confirmation, per-set storage (CR-C2), check-in body area and timing (CR-D1), "none" versus "skipped" on limitations, `estimatedMinutes`, saved personal views, plan templates and archive, pre-filled message subject | DR-002 sections 2 and 3 |

Open sign-offs (recorded as open; no answer is invented; shipped demo behaviour shown):

| Id | Question | Owner | Demo behaviour until answered |
|---|---|---|---|
| S1 | Is "Worst pain imaginable" the right upper anchor, and are both anchors acceptable? | Clinical | LOINC wording; docs say "not clinically reviewed" |
| S2 | Should a pain threshold ship with a default, and is 7 acceptable? | Clinical | 7, labelled demo default in admin settings; hidden from patients |
| S3 | What do Active, Inactive and Discharged mean, and which workflow sets the last two? | Product | Active defined in text as "intake submitted and a therapist assigned"; others shown as stored words; metrics denominator is status `active` |
| S4 | Does an amendment need its own signature; may anyone but the author amend? | Clinical governance | Signed, author only |
| S5 | Who may mark a note entered in error; is a second person needed? | Clinical governance | Author or clinic administrator, reason required, one person |
| S6 | Consent wording; what is kept if required consent is declined after an account exists; unreviewed drafts when AI consent is withdrawn; behaviour while changed wording is unread | Legal and product | Demonstration wording; account stays `intake_incomplete`, nothing deleted; no new drafts and unreviewed drafts cannot be approved; existing agreement stands with a banner |
| S7 | Review age-band edges | Product | Under 24 h, 24 to 48 h, over 48 h, labelled demo default |
| S8 | Does opening evidence count as inspection for the approval gate? | Product, with clinicians | Required for reported-change statements; marked untested |
| S9 | Is a list-level peek a record open for the audit? | Privacy | Peek not built |

## 19. Assumptions, risks, open questions

Untested assumptions (PO):
1. Patients want an explanation when a plan changes, and read it.
2. Evidence links shorten review time without lowering scrutiny.
3. "Your therapist will see this" raises reporting without creating an expectation of immediate response.
4. Button-based pain input is at least as fast as a slider for most patients.
5. Patients will find and use consent controls after onboarding.

Other assumptions: persona contexts, rule defaults, session timeouts, latency and bundle targets, 24-hour session abandonment.

Risks: breadth over depth (plan risk 1); isolation leak (risk 4); deterministic output read as model output (risk 6); Medplum gaps hidden by passing tests (broken fixtures); unverified US Core 6.1.0 element differences.

Open questions:
- Q1 Should approved summaries ever reach patients? Proposed: not in Core.
- Q2 Should coordinators be limited to a caseload? It needs a new model.
- Q3 Should patients see their own access history (HD §2.3)? Proposed as Stretch.
- Q4 How is the required consent withdrawn? Proposed: through an admin action.
- Q5 Should the emergency number be an organisation setting?

## 20. Traceability

Test types: API (`app.inject` integration), DB (constraints and triggers), Unit (Vitest), PW (Playwright with axe), Eval (`pnpm ai:eval`).

| Requirements | Criteria | Scenario | Tests | WP |
|---|---|---|---|---|
| ONB-01 to 07, ADM-01 | AC-A1 to A9 | A | API, PW, Unit | 3.1, 3.2, 6.1 |
| PLN-01 to 06, REC-03, TOD-02, SES-03 | AC-B1 to B8 | B | API, DB, PW, Unit | 2.3, 3.1, 3.3 |
| SES-01 to 04, CHK-01, 02, 04, PRG-01, 02, TOD-01, 03 | AC-C1 to C7 | C | API, PW, Unit | 3.1, 3.2 |
| RVQ-01 to 05, CHK-03, OVR-01 | AC-D1 to D7 | D | API, DB, PW | 3.1, 3.3 |
| APT-01 to 06, ADM-04, MSG-01 to 03, TOD-04 | AC-E1 to E11 | E | API, DB, PW | 4.1, 4.2, 4.3 |
| AIS-01 to 07, NOT-01, 02, AST-01, 02, CON-01 | AC-F1 to F10 | F | API, Unit, PW, Eval | 5.1, 5.2, 5.3, 5.5 |
| FHR-01 to 05 | AC-G1 to G8 | G | Unit, API | 5.4 |
| ADM-02, 03, 05 to 08, DIR-01 | AC-H1 to H6 | H | API, PW | 6.1, 6.2 |
| AUD-01 to 04, REC-01, 02 | AC-I1 to I7 | I | API, DB, PW | 2.4, 6.1, 6.2 |
| SES-05, DIR-02, AIS-08, ADM-09, FHR-06, AUD-05 | Own criteria in section 7 | Stretch | As listed | 9.1, after C3 |

All IDs carry the `REQ-` prefix.
