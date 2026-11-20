# CarePath healthcare domain, interoperability and security research

Status: research input for architecture, data model, FHIR adapters and threat model.
Access date for every source cited below: **2026-11-19**. Source IDs like [S12] map to the URL table in section 13; each row there carries that access date.
Scope reminder: CarePath is a portfolio product using synthetic data. It is not for clinical use, is not a certified EHR or health IT module, and is not HIPAA compliant or "HIPAA ready" by virtue of anything in this document (see section 10).

How to read tags:
- **Sourced**: stated by a primary source fetched in this session, cited with [S#].
- **Decision**: a CarePath design choice made by this research, not a claim from a source.
- **UNVERIFIED**: could not be confirmed from a primary source in this session; verify before relying on it.

---

## 0. Findings that change the plan

1. **US Core version is ambiguous in what the web served.** The HL7 announcement says US Core Edition 9.0.0 (STU9) was published 2026-05-30 [S43], and the version-history page calls 9.0.0 "the current published version" [S42]. But individual profile pages fetched the same day displayed 7.0.0 (CarePlan, Observation Screening Assessment, clinical-notes guidance) [S46][S51][S53], 8.0.1 (Patient, Encounter, Goal, Organization) [S44][S48][S49][S55] and 9.0.0 (DocumentReference, Condition, Practitioner, Provenance, Clinical Result) [S47][S50][S52][S54][S56]. The IG home page itself reported 8.0.0 as current [S41], while general-requirements reported 9.0.0 [S45]. Likely cache/mirror skew, but unresolved. **Decision:** pin one version in config (recommend 9.0.0 as the published current), and treat every Must Support list in this file as "verify against the pinned package with the validator". Several hl7.org pages (including `/fhir/us/core/STU9/...` paths and `history.html`) were refused by the site's robots policy for the fetch tool, so the STU9 pages could not be read directly.
2. **Synthea lags US Core.** Synthea's release notes say v4.0.0 added US Core 7 support and v3.4.0 made US Core 6 the default [S84]; the Synthea FHIR wiki lists 6.1.0, 5.0.1, 4.0.0, 3.1.1 [S85]; the config page shows `us_core_version` default 5.0.1 and `use_us_core_ig` default false [S83]. Expect profile-version mismatches if Synthea output is validated against US Core 9. **Decision:** use Synthea as a seed source, not as a conformance oracle; validate against the version Synthea emitted for import tests.
3. **The brief's internal model list (section 11) has no Condition and no Location/Slot/Schedule/PractitionerRole/Provenance models**, but section 12 requires Condition mapping and references need Practitioner/Organization context. **Decision:** add a `Condition` (problem list / diagnosis) table, derive `PractitionerRole` from `OrganizationMembership` + `Role`, and generate `Provenance` at export time (details in section 4).
4. **The brief requires the validator-style checks to be real.** The HL7 validator's own documentation says it is "not supported for use in production systems" [S87], so use it in CI and import test harnesses, not as a runtime dependency of the API.
5. **OAuth 2.1 is still an Internet-Draft.** Latest seen: draft-ietf-oauth-v2-1-17 dated 2026-10-31, targeted at the IESG in December 2026 [S61]. Do not cite it as a standard; build to RFC 6749 plus the practices that the draft and SMART adopt (PKCE, exact redirect match).
6. **HIPAA Security Rule rewrite is proposed, not final, per HHS's own page.** HHS lists the NPRM issued 2024-12-27 and no final rule (page last reviewed 2025-06-27) [S69]. Controls here are not mapped to proposed text.

---

## 1. Practical model of identities

### 1.1 Concepts (sourced)

- **Patient** in FHIR is the individual receiving care. Base R4 has no required elements on Patient other than the nested `link.other`/`link.type` and `communication.language` when those backbones are present; `identifier`, `name`, `address`, `generalPractitioner` are all 0..*; `active`, `deceased[x]`, `link` are modifier elements; `managingOrganization` is Reference(Organization); `generalPractitioner` is Reference(Organization | Practitioner | PractitionerRole) [S1]. The spec says the resource id should not be an MRN; identifiers belong in `Patient.identifier` [S1].
- **Practitioner** elements are all optional (`identifier`, `active`, `name`, `telecom`, `address`, `gender`, `birthDate`, `photo`, `qualification`, `communication`); `qualification.code` is 1..1 when a qualification is present [S2]. `PractitionerRole` (a practitioner's role at an organization) is referenced from Patient.generalPractitioner, CarePlan.author, Observation.performer, etc. [S1][S4][S5].
- **Organization**: invariants org-1 (must have a name or an identifier), org-2 and org-3 (address/telecom use can never be `home`); `partOf` is a Reference(Organization) [S3].
- **US Core** tightens these: Patient mandatory = identifier and name; Must Support includes birth date and address [S44]. Practitioner identifier is 1..* Must Support, and when an NPI slice is present its system is fixed to `http://hl7.org/fhir/sid/us-npi` and the value must be 10 digits and pass the Luhn check (us-core-16, us-core-17) [S54]. Organization mandatory = active and name [S55]. A Medplum page describing a US Core Patient rejection lists `identifier`, `name` and `gender` as missing fields [S91], so gender may also be required in the pinned version: **verify with validator**.
- **SMART identity**: the `fhirUser` claim (requires `openid`) points to a Patient, Practitioner, PractitionerRole, RelatedPerson or Person resource [S58]. Scope prefixes `patient/`, `user/`, `system/` distinguish patient-in-context, logged-in-user and backend access [S58].

### 1.2 CarePath identity model (Decision)

| Concept | Internal | FHIR representation | Rule |
|---|---|---|---|
| Login principal | `User` (email/credential, MFA state, status) | none (not exported) | A User links to exactly one Patient profile OR one Practitioner profile OR neither (pure admin). Never export credentials. |
| Patient | `Patient` (1:1 with a patient `User`, nullable until activation) | `Patient` | `Patient.id` = internal UUID; MRN/clinic number goes in `identifier` with a CarePath system URI; never use MRN as `id` [S1]. |
| Clinician | `Practitioner` (1:1 with clinician `User`) | `Practitioner` | Identifier = CarePath staff id. Omit the NPI slice for synthetic staff unless a Luhn-valid synthetic value is generated, since us-core-17 will fail invalid values [S54]. |
| Role in a clinic | `OrganizationMembership` (user, organization, role, status, period) | `PractitionerRole` (practitioner, organization, code) | Derived, not stored twice. A person can hold different roles in different orgs. |
| Clinic | `Organization` | `Organization` | Tenant boundary. `active` and `name` always populated (US Core) [S55]. |
| Care team | `CareTeam` | `CareTeam` is not in the 10 required mappings; reference practitioners via `CarePlan.contributor`/`author` instead | CarePlan.careTeam is Reference(CareTeam) [S4]. Export `CareTeam` only if time allows. |
| Administrative staff | `User` + membership with admin role | No Practitioner unless they deliver care | Prevents leaking non-clinical staff as clinical actors. |

Role vocabulary (Decision): `patient`, `physical_therapist`, `care_coordinator`, `clinic_admin`, plus a non-human `system` actor for jobs/AI service. Roles are per-organization via membership, never global on User.

---

## 2. Consent, PHI, RBAC and audit (practical models)

### 2.1 Protected health information (PHI)

- **Sourced:** PHI is individually identifiable health information held or transmitted by a covered entity or business associate, in any form, relating to health, care provided or payment, and identifying or reasonably usable to identify the person [S63]. HIPAA's Privacy Rule applies to covered entities (health plans, clearinghouses, providers that transmit electronically in standard transactions) and business associates [S63]. The Security Rule protects ePHI and applies to those "regulated entities" [S62].
- **Sourced:** HHS Safe Harbor de-identification removes 18 identifier categories, including names, geographic units smaller than a state, all date elements except year, phone/fax/email, SSN, MRN, plan numbers, account numbers, license numbers, device identifiers, URLs, IP addresses, biometrics, full-face photos and any other unique identifying code [S64]. HHS says de-identified information "is no longer considered protected health information" but risk "is not zero" [S64].
- **Sourced:** Encrypted ePHI is still ePHI, and a cloud provider that stores it, even without keys, is a business associate requiring a BAA [S67]. Whether a health-app developer is a business associate depends on the scenario; HHS publishes scenario guidance and an FTC tool for determining which laws apply [S68].
- **Decision (what counts as PHI in CarePath):** treat as PHI-equivalent every field in these tables: names, DOB, contact, address, identifiers, appointment dates and times, check-in text, pain scores, exercise sessions, clinical notes, AI prompts/outputs derived from them, message bodies, audit entries that reference a patient, and file/video artifacts. Even though all data is synthetic, the code paths treat it as PHI so the portfolio demonstrates the right engineering habits.
- **Decision (PHI rules for logs/analytics/AI):** application logs carry request ids, route templates, status codes, actor ids and resource ids only, never bodies, query strings with identifiers, or tokens. No third-party analytics SDK receives PHI-equivalent fields. The AI service receives only synthetic data in the demo; any real external model provider would need a BAA, which CarePath does not have (compare cloud guidance [S67]).

### 2.2 Consent

- **Sourced:** FHIR `Consent` records a consumer's choices permitting or denying recipients to perform actions; four intended uses (privacy, treatment, research, advance directives) with only privacy modeled; enforcement is out of scope and left to access control mechanisms such as OAuth/UMA/XACML [S17]. R4 required elements: `status` (draft, proposed, active, rejected, inactive, entered-in-error), `scope`, `category` 1..*; invariants ppc-1 (policy or policyRule must exist) and ppc-2..5 (patient required when scope is privacy/research/adr/treatment); `provision.type` permit/deny, nested provisions for exceptions [S17]. A Consent is not automatically a legally binding directive [S17].
- **Decision:** the internal `Consent` model has types `treatment_and_data_use` (required for onboarding), `remote_monitoring`, `ai_assisted_features`, `motion_tracking` (optional camera/pose feature), `data_sharing_export`. Fields: patient, organization, type, status (`active|inactive|rejected|entered_in_error`), granted_at, revoked_at, version of the consent text shown, captured_by. Enforcement is in application code (e.g., no AI summary generated, no motion-tracking data stored unless an active consent of that type exists) and each denial is audit-logged. FHIR export emits `Consent` with scope `patient-privacy`/`treatment` only for what was actually captured; exporting a Consent does not itself enforce anything [S17]. Include `Consent.policyRule` or `policy.uri` to satisfy ppc-1 [S17].
- **Gap flagged:** The consent code values (`patient-privacy` etc.) were not retrieved; the R4 page only lists scope codes privacy, research, adr, treatment [S17]. Use those four verbatim.

### 2.3 Audit logs (AuditEvent)

- **Sourced:** AuditEvent is "a record of an event made for purposes of maintaining a security log"; it is based on IHE ATNA; security-relevant events include login/logout, access control decisions, configuration changes and data manipulation; content is for security/privacy/records staff and not for providers or patients directly; servers generally would not accept updates or deletes; access is typically limited to security, privacy or system administration [S18]. Provenance records how a resource came to be in its current state, while AuditEvent logs events; the two overlap [S18][S22].
- **Sourced elements:** `type` 1..1, `subtype` 0..*, `action` 0..1 (C, R, U, D, E), `recorded` 1..1 (instant), `outcome` 0..1 (0 success, 4 minor failure ~HTTP 400, 8 serious failure ~HTTP 500, 12 major failure), `agent` 1..* with required boolean `requestor` and optional `who`, `source` 1..1, `entity` 0..* [S19][S20][S21]. `entity.what` is a reference to any resource and "should be version specific" [S18].
- **Decision (internal `AuditEvent` table):** append-only; columns: id, occurred_at (UTC), organization_id, actor_user_id, actor_role, actor_type (user/system/ai), action (C/R/U/D/E plus a CarePath event name such as `phi.read`, `auth.login`, `authz.denied`, `export.fhir`), outcome (0/4/8/12), resource_type, resource_id, patient_id (nullable), request_id, source_ip hash or truncated, purpose_of_use (treatment, operations, patient-access, admin, export), result detail code (no free text with PHI). Application DB role has INSERT and SELECT only (no UPDATE/DELETE) to follow the "no updates or deletes" guidance [S18]; add a per-row hash chain for tamper evidence (Decision; ties to HIPAA "integrity" safeguard [S62]). Read access to the audit table is limited to `clinic_admin` (and a patient's own access history view if built, scoped to that patient). Export as FHIR AuditEvent only through an admin-restricted endpoint [S18].
- **What to audit (Decision):** every authentication event and failure, every authorization denial (Scenario I), every read/search of a patient record or note by a clinician or admin, every write, every AI generation and review, every export/import, consent changes, role/membership changes.

### 2.4 RBAC and minimum necessary

- **Sourced:** HHS minimum necessary policies must identify which people or classes in the workforce need PHI for their jobs, what categories, and under what conditions [S65]. The standard does not apply to treatment disclosures, disclosures to the individual, authorized disclosures, and disclosures required by law [S65]. De-facto role-based access policies are expected [S63].
- **Sourced (SMART scopes):** v2 scopes are `<context>/<ResourceType>.<cruds>` with letters in c-r-u-d-s order, e.g., `patient/Observation.rs`; search-parameter constraints can be appended; granted scopes may differ from requested and actual access remains limited by user/client policy [S58].
- **Decision (permission matrix, resource x role; all checks also enforce organization_id equality):**

| Resource | patient | physical_therapist | care_coordinator | clinic_admin |
|---|---|---|---|---|
| Own Patient demographics | r, u (limited fields) | r (assigned/org patients) | r, u (admin fields) | r |
| Other patients | none | r only for care-team patients (default) or org-wide if `clinic_policy.broad_access` with audit reason | r for patients in assigned caseload | r (admin fields only, no clinical content) |
| CarePlan / Goal / ExerciseAssignment | r (own, published versions) | c, r, u, publish (own caseload) | r | r (metadata only) |
| ExerciseSession / CheckIn / Observation | c, r (own) | r | r (summary) | none (aggregates only) |
| ClinicalNote | r (own, signed, patient-visible only) | c, r, u (draft), sign (author only) | none | none |
| AI generations | r (own patient-facing outputs) | c, r, review/accept | r (limited) | none |
| Appointment / Availability | c, r, cancel (own) | r, manage own availability | c, r, manage all | r, configure |
| Messaging | c, r (own threads) | c, r (care-team threads) | c, r | none by default |
| Consent | c, r, revoke (own) | r | r | r |
| AuditEvent | r (own access history, optional) | none | none | r |
| FHIR export / import | export own record (patient portal) | export for caseload | none | export/import org-wide, admin-only import |
| User / membership admin | none | none | none | c, r, u, deactivate |

  Enforce with deny-by-default policy functions (resource, action, actor, org, relationship) called on every route, never client-side checks only. Break-glass access (clinician outside care team) requires an explicit reason string and always produces an AuditEvent (Decision).

---

## 3. Clinical domain concepts

### 3.1 Encounters and appointments

- **Sourced:** Appointment is for scheduling; "Encounter should not store appointment information" and `Encounter.appointment` links to it [S13]. Encounter `status` required: planned, arrived, triaged, in-progress, onleave, finished, cancelled, entered-in-error, unknown [S14]. `class` is 1..1 Coding from v3 ActEncounterCode (extensible) [S13]. `participant.individual` may be Practitioner, PractitionerRole or RelatedPerson (not Patient; the patient is `subject`) [S13]. `serviceProvider` is Reference(Organization) [S13]. US Core Encounter mandatory: status, class, type, subject (v8.0.1 page) [S48].
- **Sourced:** v3-ActCode `AMB` = ambulatory (patient came in, not assigned a bed, also called outpatient) and `VR` = virtual (patient and practitioner not in the same physical location; examples include phone, email, video conference) [S39][S40]. These were confirmed via tx.fhir.org `$lookup`.
- **Sourced:** Appointment status value set (10 codes): proposed, pending, booked, arrived, fulfilled, cancelled, noshow, entered-in-error, checked-in, waitlist [S11]. `status` 1..1; `participant` 1..*; `participant.status` 1..1; `start`/`end` are `instant` and optional; `minutesDuration` can differ from end minus start; cancelling should release participant calendars [S10]. Invariants: app-1 (participant type or actor required), app-2 (start and end both present or both absent), app-3 (start/end required unless status is proposed/cancelled/waitlist per the expression; the human text mentions only proposed and cancelled), app-4 (cancelation reason only with cancelled or no-show; the expression string uses `'no-show'` while the code system code is `noshow`) [S12]. **Verify these quirks with the validator before encoding.**
- **Decision (state mapping):**
  - Internal `Appointment.status`: `requested -> booked -> checked_in -> in_progress -> completed`, plus `cancelled_by_patient`, `cancelled_by_clinic`, `no_show`, `rescheduled` (a new row linked via `rescheduled_from`; old row becomes `cancelled`).
  - FHIR: requested -> `proposed` (or `pending` if clinic must confirm), booked -> `booked`, checked_in -> `checked-in`, in_progress -> `arrived`, completed -> `fulfilled` (with an Encounter), cancelled_* -> `cancelled` (with `cancelationReason`), no_show -> `noshow`.
  - **Encounter is created only for a synchronous visit that happened** (in-person `AMB` or video `VR`). Asynchronous clinician review of check-ins is not an Encounter; it is a `ReviewTask` (not exported) plus an optional ClinicalNote. Encounter `period` captures actual start/end; Appointment holds the planned slot.
  - `AvailabilitySlot` maps to FHIR `Slot`/`Schedule` conceptually [S10 mentions Slot references]; those two resources are outside the 10 required and are not exported in v1.
  - All timestamps stored UTC; Appointment start/end exported as instants with timezone offset (Decision; required by the instant type [S10]). Date-only values (Goal dates, birthDate) stay `date`.

### 3.2 Care plans, goals, exercises

- **Sourced CarePlan:** `status` 1..1 (draft, active, on-hold, revoked, completed, entered-in-error, unknown), `intent` 1..1 (proposal, plan, order, option), `subject` 1..1 Reference(Patient|Group); `author`, `contributor`, `careTeam`, `addresses`(Condition), `goal`(Goal) all by reference; `replaces`/`basedOn`/`partOf` reference other CarePlans; `activity` is `reference` XOR `detail` (invariant cpl-3); `activity.detail.status` is required (not-started, scheduled, in-progress, on-hold, completed, cancelled, stopped, unknown, entered-in-error); `detail.kind` binding is Appointment, CommunicationRequest, DeviceRequest, MedicationRequest, NutritionOrder, Task, ServiceRequest, VisionPrescription; `detail.scheduled[x]` is Timing/Period/string [S4]. US Core CarePlan: status, intent, subject and a `category` slice with code `assess-plan` (system `http://hl7.org/fhir/us/core/CodeSystem/careplan-category`); Must Support includes narrative `CarePlan.text`; guidance says goals go in `CarePlan.goal` and conditions in `CarePlan.addresses` (v7.0.0 page) [S46].
- **Sourced Goal:** `lifecycleStatus` 1..1 (proposed, planned, accepted, active, on-hold, completed, cancelled, entered-in-error, rejected), `description` 1..1 CodeableConcept, `subject` 1..1; `target.measure` (LOINC example binding), `target.detail[x]`, `target.due[x]` (date or Duration); `expressedBy` and `addresses` are references; `outcomeReference` is Observation-only [S8][S9]. US Core Goal mandatory: lifecycleStatus, description, subject; Must Support: start date, target due date (servers must support at least one), expressedBy (v8.0.1 page) [S49].
- **Decision (versions):** `CarePlanVersion` rows are immutable once published. Export the **currently active version** as one FHIR `CarePlan` (status `active`); export prior versions as separate CarePlans with status `revoked` (superseded) or `completed`, each newer one pointing to the older via `CarePlan.replaces` [S4], and a `Provenance` whose target is the version-specific reference. `meta.versionId` is not used to carry domain versions.
- **Decision (exercise assignments):** `ExerciseAssignment` -> `CarePlan.activity.detail` (inline, never `reference`, to avoid cpl-3 conflicts [S4]) with `kind = ServiceRequest` (in the allowed binding [S4]), `status` mapped from assignment state, `description` = exercise name and dosage text, `scheduled[x]` = Timing (frequency per week, duration), `code` = CarePath exercise code system (a local system URI; no standard LOINC/SNOMED code verified for individual exercises, **UNVERIFIED** whether SNOMED CT has suitable procedure concepts). Exercise library content itself is not exported.
- **Decision (sessions and check-ins):** `ExerciseSession` and `PatientCheckIn` are patient-generated data. Export pain NRS and functional measures as Observation (3.3). Export adherence as an `Observation` with `basedOn` = the CarePlan (Observation.basedOn accepts CarePlan [S5]) or leave out of v1 export; adherence percentages are derived metrics and should not be exported as clinical Observations without a clear code (Decision).

### 3.3 Observations and LOINC codes

- **Sourced Observation:** `status` 1..1 with 8 codes (registered, preliminary, final, amended, corrected, cancelled, entered-in-error, unknown) [S6]; `code` 1..1 (LOINC example binding; guidance prefers LOINC) [S5]; `subject` is 0..1 in base R4 but US Core makes it mandatory [S5][S52]; `category` preferred binding; `value[x]` 0..1 across 11 types; `dataAbsentReason` only when `value[x]` is absent (obs-6); `performer`, `encounter`, `basedOn`, `hasMember`, `derivedFrom`, `component`, `referenceRange` exist [S5]. US Core Clinical Result: mandatory status, category, code, subject; Must Support encounter, effective[x], performer, value[x] (UCUM units when numeric), dataAbsentReason; value type follows LOINC scale type [S52]. US Core Screening/Assessment: category slice `survey`; value in `value[x]` for single response, or `hasMember`/`component` for overarching assessments; if no component/hasMember either value or dataAbsentReason must be present (us-core-2) [S51]. The page has no pain-specific guidance [S51].
- **Verification method:** codes below were looked up on the HL7 public terminology server (tx.fhir.org, LOINC 2.82/2.83 content) via `CodeSystem/$lookup` or `ValueSet/$expand?filter=`, or on loinc.org. Filter searches are text matches and may miss codes, so "not found" is not proof of absence.

| Concept | Code | LOINC display (as returned) | Status | Notes |
|---|---|---|---|---|
| Pain severity, 0-10 numeric rating (NRS) | **72514-3** | Pain severity - 0-10 verbal numeric rating [Score] - Reported | **Verified** [S24][S25]; loinc.org page lists scale Qn | Use `valueQuantity` (Qn scale, UCUM required for numerics [S52]). Unit `{score}` as UCUM annotation is **UNVERIFIED**; validator will confirm. Category `survey` (US Core screening-assessment) [S51]. |
| Pain severity (ordinal, reported) | 38208-5 | Pain severity - Reported | **Verified**, ACTIVE, answer-list based [S34] | Categorical (mild/moderate/severe) alternative. |
| Pain severity VAS | 38214-3 | Pain severity [Score] Visual analog score | Verified to exist in expansion [S31] | Only if a VAS is used. |
| Pain severity, Faces (FPS-R) | 57696-7 | Pain severity FPS-R | Exists in expansion [S31] | Optional. |
| PROMIS physical function v2.0 T-score | 91721-1 | PROMIS physical function - version 2.0 T-score | **Verified**, ACTIVE [S36][S28] | Instrument licensing/terms: **UNVERIFIED**; LOINC codes may carry external copyright notices that must be shown [S37]. |
| PROMIS-29 physical function score | 71960-9 | PROMIS-29 Physical function score | Exists in expansion [S28] | Alternative. |
| Oswestry Disability Index (item set / score) | 97908-8 / 97909-6 | Oswestry Disability Index / Oswestry disability index score ODI | Exist in expansion [S30] | Back-pain use cases. External copyright notice likely; **UNVERIFIED**. |
| Knee flexion active ROM | 41379-9 (also 41343-5 left, 41347-6 right) | Knee Flexion Active Range of Motion Quantitative | Exist in expansion [S33] | Unit (degrees) and UCUM form **UNVERIFIED**. Passive: 41380-7, 41344-3, 41348-4. |
| Six minute walk test | 64098-7 | Six minute walk test | Exists in expansion [S27] | Exact property (distance vs. result panel) **UNVERIFIED**; one other hit "Yards walked 6 minutes [PhenX]" 66245-2. |
| 4-meter gait speed | 83144-6 | 4-Meter Walk Gait Speed Test [NIH Toolbox] | Exists in expansion [S29] | Instrument-specific; **UNVERIFIED** suitability as a general gait speed code. |
| Timed Up and Go | 89422-0 | Timed Up and Go test and physical findings of gait panel CDC | Panel only [S26] | No standalone TUG-seconds code found. **Use a local code** unless a verified one is found. |
| Berg Balance, LEFS, Patient-Specific Functional Scale, 30-second chair stand | none found | | Filter searches returned no concepts [S38]; chair-stand search returned questionnaire items only [S32] | **Use a local code system** `urn:carepath:observation-code` (Decision), documented as local. Do not invent LOINC codes. |

  Note: a LOINC-licensed product must display a LOINC notice ("This material contains content from LOINC (http://loinc.org)") and keep LOINC ids and display names unmodified; any new local codes begin with "X" per LOINC rules for local LOINC-table additions [S37]. **Decision:** add the notice to docs and the app's About/Legal page.
- **Decision (Observation shape):** every Observation exported with `status=final` (corrections create `amended`/`corrected` per R4 definitions [S6]), `subject` = Patient, `effectiveDateTime` (UTC instant, at least day precision [S52]), `performer` = Patient for patient-reported or Practitioner for clinician-measured, `encounter` when captured in a visit, `category` per above. Observations entered in error are `entered-in-error`, never deleted. Free-text check-in notes are not Observations; map them to `Observation.note` only if short, otherwise leave unexported.

### 3.4 Conditions

- **Sourced:** Condition requires `subject`; `clinicalStatus` (active, recurrence, relapse, inactive, remission, resolved) and `verificationStatus` (unconfirmed, provisional, differential, confirmed, refuted, entered-in-error); con-4 (abatement implies clinicalStatus inactive/resolved/remission), con-5 (clinicalStatus absent when entered-in-error); category `problem-list-item` or `encounter-diagnosis` [S7]. US Core Condition Problems and Health Concerns: category (`problem-list-item` or `health-concern`), code, subject mandatory; Must Support includes clinicalStatus, verificationStatus, onset, abatement, recordedDate (v9.0.0 page) [S50].
- **Decision:** add table `Condition` (patient_id, code system+code+display, category, clinical_status, verification_status, onset_date, abatement_date, recorded_by, encounter_id nullable, note). `IntakeAssessment.reason_for_care` stays free text for the product UI; clinician-confirmed diagnoses go to `Condition`. Code system choice (ICD-10-CM vs SNOMED CT): licensing not verified, **UNVERIFIED**; Synthea emits SNOMED CT conditions, so imports must tolerate SNOMED codes without CarePath bundling the full terminology.

### 3.5 Clinical notes (DocumentReference)

- **Sourced:** DocumentReference `status` 1..1 (current, superseded, entered-in-error), `docStatus` (preliminary, final, amended, entered-in-error), `type`, `category`, `subject`, `author`, `authenticator`, `custodian` (Organization), `relatesTo` (replaces/transforms/signs/appends), `content` 1..* with `attachment` 1..1, `context.encounter`; its scope is "any serialized object with a mime-type" [S15]. US Core DocumentReference mandatory: status, type, category, subject, content, MIME type; Must Support: identifier, date, author, format, encounter, period; `type` binding includes Common Clinical Notes; category value `clinical-note`; constraint us-core-6 requires `attachment.url` or `data`; every DocumentReference must identify a responsible Organization through `custodian` or Provenance; different versions are separate DocumentReferences linked by `relatesTo` (v9.0.0 page) [S47]. Common clinical note LOINC examples: 18842-5 discharge summary, 11488-4 consultation note, 34117-2 H&P, 11506-3 progress note, 28570-0 procedures note [S53]; 11506-3 display confirmed as "Progress Note" [S35].
- **Decision:** a CarePath `ClinicalNote` has states `draft -> pending_signature -> signed -> amended | entered_in_error`. **Only signed notes are exported**, as DocumentReference `status=current`, `docStatus=final` (amendments: new DocumentReference `docStatus=amended` with `relatesTo.code=replaces`; old one `status=superseded`) [S15]. Type default `11506-3` (progress note) for PT visit notes, `34117-2` for initial evaluation (H&P-like); category `clinical-note`; `custodian` = clinic Organization; author = signing Practitioner; content = `text/plain` or `text/html` attachment inline base64 `data` (small notes) with `contentType` populated [S47]. AI drafts are never exported until a clinician has reviewed and signed; AI involvement is represented in the internal `AIGeneration`/`AIReview` models and optionally in `Provenance` entities (Decision). Exports carry no unrelated drafts.

### 3.6 Provenance

- **Sourced:** Provenance `target` 1..*, `recorded` 1..1, `agent` 1..* (`who` Reference(Practitioner|PractitionerRole|RelatedPerson|Patient|Device|Organization), optional `onBehalfOf`), `entity` (role derivation/revision/quotation/source/removal; `what` any resource) [S22]. US Core Provenance Must Support covers target, recorded, agent, agent.type, who, onBehalfOf and the author/transmitter slices [S56].
- **Decision:** generate Provenance entries inside export bundles for CarePlan, DocumentReference, Observation (clinician-entered) and any resource whose author or organization is not otherwise present, so US Core's "responsible organization" expectation is met [S47].

---

## 4. Internal model to FHIR R4 mapping (the 10 resources)

Conventions (Decision): internal UUID -> `Resource.id` for exports; `identifier` carries stable external/business ids with system `urn:carepath:<org-slug>:<kind>`; `meta.profile` lists only profiles the resource has been validated against; `meta.lastUpdated` from internal `updated_at` (UTC); references inside a bundle use `urn:uuid:` fullUrls when importing/transaction, or relative `Type/id` for standalone `collection` exports [S16].

Legend: "R4 req" = 1..* in base R4 cardinality from the source; "US Core mand." = Mandatory per the US Core page seen (version noted) [S44-S56]; verify against pinned version.

| # | Internal model(s) | FHIR resource | R4 required | US Core mandatory (version seen) | Key reference rules (allowed targets, per R4) | CarePath notes / decisions |
|---|---|---|---|---|---|---|
| 1 | `Patient`, `User` (link only) | **Patient** | none at top level; `link.other`+`link.type`, `communication.language` only if those backbones used [S1] | identifier, name (8.0.1) [S44]; birthDate, address are Must Support; gender possibly required (**verify**) [S91] | `managingOrganization` -> Organization; `generalPractitioner` -> Organization \| Practitioner \| PractitionerRole; `link.other` -> Patient \| RelatedPerson [S1] | `id`=UUID; MRN as `identifier` [S1]. `active` and `deceased[x]` are modifiers so always set `active` explicitly [S1]. Do not export credentials, MFA, device tokens. managingOrganization = tenant Organization. |
| 2 | `Practitioner`, `OrganizationMembership`, `Role` | **Practitioner** (+ derived `PractitionerRole`) | none; `qualification.code` if qualification used [S2] | identifier, name; NPI slice Luhn-valid if present (9.0.0) [S54] | `qualification.issuer` -> Organization [S2]; PractitionerRole (derived) links practitioner + organization | Export only users with a clinician role. Omit NPI unless Luhn-valid synthetic value is generated [S54]. Admin-only users are not exported. |
| 3 | `Organization` | **Organization** | org-1: name or identifier [S3] | active, name (8.0.1) [S55] | `partOf` -> Organization [S3] | One tenant = one Organization; sub-clinics via `partOf`. No `home` address/telecom use (org-2, org-3) [S3]. |
| 4 | `CarePlan`, `CarePlanVersion`, `ExerciseAssignment` | **CarePlan** | status, intent, subject [S4] | status, intent, subject, category `assess-plan` (7.0.0 page) [S46] | `subject` -> Patient \| Group; `author`/`contributor` -> Patient, Practitioner, PractitionerRole, Device, RelatedPerson, Organization, CareTeam; `careTeam` -> CareTeam; `goal` -> Goal; `addresses` -> Condition; `replaces`/`basedOn` -> CarePlan; `activity.detail.performer` -> Practitioner, PractitionerRole, Organization, RelatedPerson, Patient, CareTeam, HealthcareService, Device [S4] | Active version = current CarePlan; superseded versions linked by `replaces` (section 3.2). Exercises as inline `activity.detail` (kind ServiceRequest, status required, never also `reference`; cpl-3) [S4]. Always include the `assess-plan` category coding [S46]. `intent=plan` for treatment plans. |
| 5 | `Observation`, `PatientCheckIn`, `ExerciseSession` (derived metrics only) | **Observation** | status, code [S5] | status, category, code, subject (Clinical Result 9.0.0) [S52]; Screening/Assessment status, code, subject and survey category (7.0.0) [S51] | `subject` -> Patient \| Group \| Device \| Location; `encounter` -> Encounter; `performer` -> Practitioner, PractitionerRole, Organization, CareTeam, Patient, RelatedPerson; `basedOn` -> CarePlan etc.; `hasMember` -> Observation, QuestionnaireResponse, MolecularSequence; `derivedFrom` -> DocumentReference, ImagingStudy, Media, QuestionnaireResponse, Observation, MolecularSequence [S5] | Pain NRS = 72514-3, category `survey` [S24][S51]. Value without result needs `dataAbsentReason`, only when value absent (obs-6) [S5]. No component/code collision (obs-7) [S5]. |
| 6 | `Condition` (new) | **Condition** | subject [S7] | category, code, subject (Problems & Health Concerns, 9.0.0) [S50] | `subject` -> Patient \| Group; `encounter` -> Encounter; `asserter`/`recorder` -> Practitioner, PractitionerRole, Patient, RelatedPerson [S7] | Respect con-3 (clinicalStatus for problem-list items), con-4, con-5 [S7]. Code system policy: see 3.4. |
| 7 | `Goal` | **Goal** | lifecycleStatus, description, subject [S8] | lifecycleStatus, description, subject; start/due MS (8.0.1) [S49] | `subject` -> Patient \| Group \| Organization; `expressedBy` -> Patient, Practitioner, PractitionerRole, RelatedPerson; `addresses` -> Condition, Observation, MedicationStatement, NutritionOrder, ServiceRequest, RiskAssessment; `outcomeReference` -> Observation only [S8] | Referenced from `CarePlan.goal` [S4][S46]. `target.measure` can carry the LOINC measure (e.g., 72514-3) with `target.detail[x]` Quantity and `due[x]` date [S8]. Map internal `achieved` to `lifecycleStatus=completed` plus `achievementStatus` (code system not retrieved; **UNVERIFIED**). |
| 8 | `Appointment`, `AvailabilitySlot` | **Appointment** | status, participant (1..*) each with `status` [S10] | not retrieved (no US Core Appointment profile read) | `participant.actor` -> Patient, Practitioner, PractitionerRole, RelatedPerson, Device, HealthcareService, Location; `slot` -> Slot; `basedOn` -> ServiceRequest; `reasonReference` -> Condition, Procedure, Observation, ImmunizationRecommendation [S10] | State mapping in 3.1. Obey app-1..app-4 [S12]. Include both patient and practitioner participants with `status` (accepted/declined/needs-action codes **UNVERIFIED**, value set not retrieved). |
| 9 | `Encounter` | **Encounter** | status, class [S13][S14] | status, class, type, subject (8.0.1) [S48] | `subject` -> Patient \| Group; `participant.individual` -> Practitioner \| PractitionerRole \| RelatedPerson; `appointment` -> Appointment; `serviceProvider` -> Organization; `reasonReference` -> Condition, Procedure, Observation, ImmunizationRecommendation; `diagnosis.condition` -> Condition \| Procedure; `partOf` -> Encounter [S13] | `class` AMB or VR [S39][S40]. Created only for synchronous visits (3.1). `period` = actual times (UTC). US Core requires `type` (a CodeableConcept; value set not retrieved) so supply a local or SNOMED type code. |
| 10 | `ClinicalNote` (+ `AIReview` sign-off) | **DocumentReference** | status, content (attachment) [S15] | status, type, category, subject, content, contentType (9.0.0) [S47] | `subject` -> Patient \| Practitioner \| Group \| Device; `author` -> Practitioner, PractitionerRole, Organization, Device, Patient, RelatedPerson; `custodian` -> Organization; `relatesTo.target` -> DocumentReference; `context.encounter` -> Encounter \| EpisodeOfCare [S15] | Signed notes only (3.5). `attachment.url` or `data` (us-core-6) [S47]. Type LOINC 11506-3 / 34117-2 [S35][S53]. |

Related mappings beyond the 10:
- `Consent` -> **Consent** (status, scope, category 1..*, patient; policy or policyRule, ppc-1..5) [S17].
- `AuditEvent` -> **AuditEvent** (type, recorded, agent with `requestor`, source) [S19]; admin-only [S18].
- Export-time **Provenance** (section 3.6) [S22].
- Bundle assembly rules in section 5.

Fields intentionally not exported: User credentials, MFA secrets, device tokens, internal ReviewTask, Notification, Message bodies (Communication is outside the 10), AI prompt/response text, rate-limit counters, raw motion-tracking data.

---

## 5. Bundles, references and duplicate detection

- **Sourced (Bundle):** types include document, message, searchset, history, transaction, batch, collection. bdl-3: `entry.request` is required for batch/transaction/history and prohibited otherwise. bdl-7: `fullUrl` unique; bdl-8: `fullUrl` cannot be version-specific. If a resource has no persistent identity use `urn:uuid:...` as fullUrl. References are resolved within the bundle by identity (fullUrl) before any external URL; version-specific references drop the version before matching; multiple matches are ambiguous [S16]. Conditional references in transactions are resolved by the server before processing [S16].
- **Decision (export):** `type=collection` for downloads and the patient-portal export (no `request` allowed per bdl-3 [S16]); `type=transaction` (with `request` POST/PUT) when pushing to a sandbox. Order resources so referenced entries precede referencing entries (Medplum provides `reorderBundle()` for this [S89]). Each entry gets `fullUrl` = `urn:uuid:<uuid>` or a stable absolute URL; resource `id` = internal UUID.
- **Decision (reference validation, own code):** (a) every `Reference.reference` resolves to a bundle entry by fullUrl or to an existing resource in the same organization; (b) target type is in the allowed list in section 4's "Key reference rules" column (encode as a table in code); (c) no dangling or ambiguous references [S16]; (d) every resource and every reference stays within one `organization_id`; (e) fullUrls unique and unversioned (bdl-7, bdl-8) [S16]; (f) a `Reference.type` field, if present, matches the target.
- **Decision (duplicate detection on import):** key on (organization, resource type, `identifier.system|value`); if none, fall back to natural keys: Patient (family+given+birthDate+gender), Practitioner (name + identifier), Appointment (patient+practitioner+start), Observation (patient+code+effective+value), DocumentReference (patient+type+date+content hash). Report as `duplicate-of` in the import result and skip or merge per admin choice. Where the sandbox is Medplum, conditional create via `ifNoneExist` must resolve to at most one match; Medplum documents that external conditional references use a search string resolved at creation and must match exactly one resource [S89].

---

## 6. Validation approach and tooling

### 6.1 Layered approach (Decision)

1. **Static types** in TypeScript: Medplum maintains FHIR TypeScript definitions (`fhirtypes`) in its repo [S88]; install via the package manager and check the current version and license first (the npm page could not be fetched; **UNVERIFIED** on npm).
2. **Internal domain validation**: schema-validate API input with the project's existing validator (the repo is a Fastify/TypeScript workspace; see `/home/claude/carepath/apps/api`).
3. **Runtime FHIR validation in the API**: `validateResource(resource, options?) -> OperationOutcomeIssue[]` from `@medplum/core` [S90]. Medplum states it can check constraints locally including slices, nested constraints and FHIRPath invariants when profiles are loaded; profiles are StructureDefinition resources with snapshots (SUSHI can produce `--snapshot`) [S91]. The page for `validateResource` itself does not list what is checked or any limitations [S90], so treat coverage as **UNVERIFIED** until contract-tested against the HL7 validator on a corpus of good and bad resources.
4. **Conformance/CI validation**: HL7 FHIR validator CLI (`validator_cli.jar`), maintained in `hapifhir/org.hl7.fhir.core` (Apache-2.0, Java 17 or later) [S86]. Usage: `java -jar validator_cli.jar <files> -version 4.0 -ig <package> -profile <canonical>`; `-output <file>` writes an OperationOutcome; `-html-output` writes a report; if no version is given it infers, defaulting to 4.0.1 [S87]. The docs caution it is "not supported for use in production systems" [S87]. The exact package id for US Core in `-ig` is **UNVERIFIED** from the page (examples omit it); `hl7.fhir.us.core` at the pinned version is the expected package name.
5. **Bundle-level checks**: HL7 validator for structure; own reference/organization/duplicate checks (section 5) because tenant boundaries are CarePath-specific.
6. **JSON Schema** (the R4 download ships a `fhir.schema.json`): not fetched, **UNVERIFIED**; known limitation from FHIR practice that JSON Schema cannot check invariants or terminology bindings. Use only for fast structural pre-checks if at all.
7. **Python alternative** (if any data tooling is Python): `fhir.resources` is BSD-licensed, Pydantic V2, version 8.3.0 (2026-07-03); it has R5 default plus R4B and STU3 subpackages and no plain R4 package since 7.0.0; it does not enforce value-set enums [S93]. Not recommended as the main validator.

### 6.2 Import validation and error reporting (Decision)

Pipeline: size and content-type limits -> JSON parse (reject duplicates keys, depth/size caps) -> resourceType allow-list (the 10 + Consent + Provenance; reject others with an explanation) -> structural + invariant validation (`validateResource`) -> profile validation (if `meta.profile` claims one we know) -> reference graph validation -> duplicate detection -> dry-run diff -> commit in one DB transaction with organization scoping -> audit event. Errors are returned as FHIR `OperationOutcome` with `issue.severity`, `issue.code`, `issue.details.text`, and `issue.expression` (path to the failing element); HTTP 400 for validation failures, 422 for semantic/profile failures, 409 for duplicates, never 200 for failed or unimplemented operations (brief section 13). OperationOutcome is the validator's own output format as well [S87].

### 6.3 Sandboxes

- **HAPI public test server** `https://hapi.fhir.org/baseR4` is a public, regularly purged test environment; the site says "Do not store any information here that contains personal health information or any other confidential information" [S92]. Acceptable only with Synthea/synthetic payloads. **Decision:** the sandbox adapter must refuse to run unless a `SYNTHETIC_DATA_ONLY=true` flag is set and the source organization is flagged synthetic.
- **Medplum**: Apache-2.0 platform with auth (OAuth, OpenID, SMART-on-FHIR), clinical data repository, API, SDK, `fhirtypes`, and deployment assets (Dockerfile, docker-compose, terraform) [S88]. Batch bundles process entries independently; on Medplum-hosted deployments transaction bundles are processed with batch (non-atomic) semantics without warning, while self-hosted deployments can enable atomic transactions; `urn:uuid` references in bundle entries are replaced with real references [S89]. **Decision:** use self-hosted Medplum in docker-compose for local/integration tests if time allows (it is a real FHIR R4 server, but this still is "sandbox integration", not EHR integration). Hosted-tier terms, quotas, and BAA availability are **UNVERIFIED**; do not send non-synthetic data.
- **Claim discipline:** document as "FHIR R4 export/import against a sandbox, validated with the HL7 validator against pinned US Core version X". Do not claim production EHR integration, SMART certification or US Core conformance of the server (US Core server conformance requires profile support declaration and required searches/interactions [S45][S47]; CarePath will not implement all of them).

### 6.4 Licensing summary

| Item | License / terms | Source |
|---|---|---|
| FHIR specification text | CC0 for the document; HL7 keeps the trademark; third-party terminologies (SNOMED CT, LOINC, ICD, CPT) may need separate licenses | [S23] |
| HL7 FHIR core + validator | Apache-2.0 | [S86] |
| HAPI public test server | Test data only; no PHI; purged regularly | [S92] |
| Medplum | Apache-2.0 | [S88] |
| Synthea | Apache-2.0 (copyright MITRE 2017-2025) | [S81] |
| fhir.resources (Python) | BSD | [S93] |
| LOINC | Free, perpetual, redistribution with notice and version; no modification of names; external copyright notices on some codes | [S37] |
| OWASP ASVS | CC BY-SA 4.0 | [S79] |
| SNOMED CT / ICD-10-CM / CPT | Not reviewed; **UNVERIFIED** | n/a (but see [S23]) |

---

## 7. SMART on FHIR and OAuth 2.0 for CarePath

- **Sourced (SMART App Launch):** current IG is STU 2.2.0 built on FHIR R4 [S57]. Patterns: discovery at `.well-known/smart-configuration`, EHR launch and standalone launch, backend services, client authentication, scopes, token introspection [S57]. All apps must support PKCE with S256; servers must not support `plain`; `state` needs at least 122 bits of entropy; `aud` names the resource server; tokens should be short-lived (ideally at most one hour); responses use no-store/no-cache headers; tokens are not forwarded to other servers; minimum necessary scopes; browser apps need CORS; "HIPAA-related controls are outside the profile's scope" [S59]. Public clients (browser/mobile) cannot hold secrets; confidential clients authenticate at the token endpoint, asymmetric preferred [S59].
- **Sourced (OAuth 2.0, RFC 6749):** authorization code flow; codes should expire quickly (10 minutes maximum recommended) and be single-use, reuse denied; redirect URI must be an absolute URI without fragment, public clients must register it, server must match it, and on mismatch must not auto-redirect; `state` is the CSRF defense; authorization and token endpoints MUST use TLS; refresh tokens only go to the authorization server; implicit grant must not issue refresh tokens [S60].
- **Sourced (OAuth 2.1 draft):** PKCE required, implicit and ROPC removed, exact redirect-URI match (loopback port exception) [S61]; still an Internet-Draft [S61].
- **Decision (what CarePath implements):**
  1. First-party web and mobile clients use the authorization-code flow with PKCE (S256), exact redirect URIs, `state`, short-lived access tokens, rotating refresh tokens bound to a device/session, or (for the web) a BFF pattern with HttpOnly, Secure, SameSite cookies and CSRF tokens (cookie-based sessions require CSRF protection; OWASP A01/A07 below).
  2. The FHIR endpoints (`/fhir/*`) accept the same bearer tokens and enforce SMART-v2-style scopes (`patient/*.rs` for patients, `user/*.cruds` constrained by role for clinicians) mapped onto the RBAC matrix; scope never grants more than RBAC allows [S58].
  3. Do **not** publish `.well-known/smart-configuration` or claim "SMART on FHIR" unless the full flow (launch context, `fhirUser`, discovery) is implemented and tested against a SMART test harness (harness availability not researched; **UNVERIFIED**). Until then describe it as "OAuth 2.0 + PKCE with SMART-style scopes".
  4. Back-end exports/imports for jobs use machine identities with short-lived tokens and the `system` actor type in audit logs.

---

## 8. Accessibility (WCAG 2.2 AA) items specific to CarePath

WCAG 2.2 adds nine success criteria and removes 4.1.1 Parsing [S70][S71]. Relevant to AA conformance and design:

| SC | Level | What it requires (sourced) | CarePath implication (Decision) |
|---|---|---|---|
| 2.4.11 Focus Not Obscured (Minimum) | AA | A focused component is not entirely hidden by author-created content; sticky headers/footers and cookie banners are typical failures; scroll padding or modal banners can fix it [S75] | Patient mobile web bottom tab bar and clinician sticky headers need `scroll-padding`; session timeout and consent banners must not cover focused controls. |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | No part of the focused component hidden [S71] | Aspirational. |
| 2.4.13 Focus Appearance | AAA | Focus indicator minimum size/contrast [S71] | Adopt as design-system token even though AAA. |
| 2.5.7 Dragging Movements | AA | Dragging functionality must be achievable with a single pointer without dragging, unless essential [S74] | Care plan builder drag-to-reorder needs move up/down buttons; NRS pain slider needs tap-to-select numerals (0-10 buttons) as the primary control; calendar drag-reschedule needs a menu alternative. |
| 2.5.8 Target Size (Minimum) | AA | Pointer targets at least 24 by 24 CSS px, with exceptions for spacing, equivalent control, inline, user-agent controls, essential [S72] | Patient mobile UI: use at least 44 CSS px for primary controls as a house standard (Decision, exceeds AA), never below 24 px for any control, incl. icon buttons in tables. |
| 3.2.6 Consistent Help | A | Help options repeated across pages appear in the same relative place [S71] | "Contact care team" / help entry in the same position across all patient screens and clinician pages. |
| 3.3.7 Redundant Entry | A | Information previously entered in the same process is auto-populated or selectable, except where essential/security/no longer valid [S76] | Onboarding, intake, booking: don't re-ask name, DOB, insurance, pain location already captured. |
| 3.3.8 Accessible Authentication (Minimum) | AA | No cognitive function test for authentication unless an alternative, a mechanism, object recognition, or personal content is provided; blocking password managers or paste fails [S73] | Allow paste and password managers; offer passkey or emailed one-time link as an alternative; avoid CAPTCHA puzzles; MFA codes must be pasteable and autofill-compatible (`autocomplete="one-time-code"`, which is an HTML feature not verified here). |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | Stricter than 3.3.8 (object recognition not exempt) [S71] | Aspirational. |

Other AA criteria carry over from WCAG 2.1; this file does not restate them. The brief's own accessibility section (BRIEF section 16) governs the rest.

---

## 9. Synthea (synthetic data) practical notes

- **Sourced:** Synthea needs a JDK 17 or newer (LTS 17 or 25 recommended); `./run_synthea [-s seed] [-p populationSize] [state [city]]`; options include `-a minAge-maxAge`, `-g gender`, `-r` reference date, `-cs` clinician seed, `-c` local config, `-d` local modules dir; same seed + same version -> same population [S81][S82]. FHIR R4 export is on by default (`exporter.fhir.export=true`); US Core export is opt-in (`exporter.fhir.use_us_core_ig=false` default, version via `exporter.fhir.us_core_version`); output goes to `./output/` by default; `exporter.years_of_history` default 10; Synthea creates one FHIR Bundle per patient using HAPI, JSON only; `exporter.fhir.transaction_bundle=true` yields transaction bundles, false yields collection bundles; practitioner and hospital information export to separate files; `bulk_data` for NDJSON is off by default [S83][S85]. License Apache-2.0 [S81].
- **Example (from the sourced options):** `./run_synthea -s 20261119 -p 50 --exporter.fhir.export=true --exporter.fhir.use_us_core_ig=true --exporter.fhir.us_core_version=6.1.0 Arizona`. State/city placement behaves as documented in [S82]; the exact property-flag syntax follows [S81]. Run in a scratch directory, never inside the repo; pass the config explicitly.
- **Latest release facts:** the Releases page shows `master-branch-latest` and v4.0.0; the jar asset name was not visible, so confirm the artifact name before scripting downloads (**UNVERIFIED**) [S84].
- **Gaps and cautions (Decision):** Synthea modules are general population health; a PT/rehab-specific module for care plans, home exercises and NRS pain scores was not confirmed in the sources (**UNVERIFIED**; check the repo's modules directory). The wiki pages read do not claim clinical realism and say nothing about suitability for clinical use [S85], so label every dataset "synthetic". Plan: take demographics, conditions and encounters from Synthea, then overlay CarePath-specific entities (care plans, exercise assignments, sessions, check-ins, pain NRS series, appointments, notes) from a deterministic seeded generator in `scripts/`. Do not mix the seed's synthetic identifiers with anything real; Synthea names/addresses are fictional but may coincidentally match real people, so the public demo shows a "Synthetic data" notice.

---

## 10. Security controls checklist

**Not a compliance claim.** Ticking these boxes does not make CarePath HIPAA compliant, certified, or suitable for real patient data. HIPAA applies to covered entities and business associates and involves administrative, physical and technical safeguards, a documented risk analysis, workforce training, contingency plans and business associate agreements [S62][S63][S67]. CarePath is a portfolio demo with synthetic data, has no covered-entity customer, no BAA, no security official, no workforce training program and no formal risk analysis. The mapping column below is a design aid showing which HHS technical-safeguard *topics* a control relates to; it is not a mapping to regulatory text. The Security Rule NPRM (issued 2024-12-27) was not final per HHS's regulatory initiatives page as reviewed 2025-06-27 [S69]; nothing here targets the proposed text. UI, README and demo copy must not say "HIPAA compliant", "HIPAA ready", "FDA cleared" or "clinically certified" (brief section 14).

HHS Security Rule technical-safeguard topics used for tagging: **AC** access control, **AU** audit controls, **IN** integrity, **PA** person/entity authentication, **TS** transmission security [S62]. Administrative and physical safeguards (risk analysis, security official, training, contingency plan, BAAs, facility/media controls) are listed in [S62] and are **out of scope / not implemented**.

References: OWASP Top 10:2025 categories A01 Broken Access Control, A02 Security Misconfiguration, A03 Software Supply Chain Failures, A04 Cryptographic Failures, A05 Injection, A06 Insecure Design, A07 Authentication Failures, A08 Software or Data Integrity Failures, A09 Security Logging and Alerting Failures, A10 Mishandling of Exceptional Conditions [S77]. OWASP API Security Top 10 (2023): API1 BOLA, API2 Broken Authentication, API3 Broken Object Property Level Authorization, API4 Unrestricted Resource Consumption, API5 Broken Function Level Authorization, API6 Unrestricted Access to Sensitive Business Flows, API7 SSRF, API8 Security Misconfiguration, API9 Improper Inventory Management, API10 Unsafe Consumption of APIs [S78]. ASVS is at 5.0.0 (published 2025-05-30), license CC BY-SA 4.0 [S79]; its Level 2 is described as suited to apps handling sensitive or healthcare data, Level 3 to the most critical applications [S80]. **Decision:** target ASVS Level 2 as the design reference and test selected requirements; do not claim ASVS certification.

| # | Control (Decision) | OWASP Top 10:2025 / API 2023 | HHS topic tag | Verify by |
|---|---|---|---|---|
| 1 | Deny-by-default authorization on every route and FHIR endpoint; policy function (actor, role, action, resource, organization, relationship) called server-side | A01; API1, API3, API5 | AC | Authorization test matrix per role x endpoint; Scenario I |
| 2 | Organization boundary on every query (org_id in every WHERE, composite FKs, optional Postgres row-level security); no endpoint accepts org_id from client for scoping | A01; API1 | AC | Cross-tenant tests for every resource id; fuzz IDs |
| 3 | Non-enumerable ids (UUID/random), but never rely on them for authz (IDOR/BOLA) | A01; API1 | AC | BOLA tests: patient A token on patient B ids |
| 4 | Property-level authorization: response DTOs per role (e.g., patient never sees internal review notes, AI confidence internals reserved for clinicians; admins see no clinical content) and mass-assignment protection (explicit allow-listed input fields) | API3 | AC (minimum necessary [S65]) | Contract tests on DTOs; reject unknown fields |
| 5 | Authentication: Argon2id (or bcrypt/scrypt) hashes, MFA for clinician/admin, lockout/backoff, passkey or emailed link option (also meets WCAG 3.3.8 [S73]), no credentials in logs | A07; API2 | PA | Auth tests, brute-force test, password reset flow review |
| 6 | Sessions: server-side session or short-lived tokens, rotation on privilege change, idle and absolute timeouts, logout revokes refresh token, cookies HttpOnly/Secure/SameSite, CSRF tokens for cookie auth | A07, A01 | PA, AC | Session tests; cookie flag checks |
| 7 | OAuth 2.0 authorization-code with PKCE S256, exact redirect match, `state`, single-use short-lived codes, no tokens in URLs, CORS allow-list [S59][S60][S61] | A07, A02 | PA, TS | Auth-flow tests incl. replay of codes |
| 8 | Input validation at the edge (schema), output encoding, parameterized queries only, ORM raw-query ban, file upload type/size limits and AV (if uploads exist) | A05; API3, API10 | IN | Static analysis rules, injection test cases |
| 9 | Rate limiting and quotas: auth, password reset, AI endpoints (cost and abuse), booking (business-flow abuse), export/import, search/pagination caps | A06, A10; API4, API6 | AC | Load/abuse tests; 429 with Retry-After |
| 10 | Booking and scheduling abuse controls (slot hoarding, repeated cancel/rebook), per-patient limits | A06; API6 | AC | Business-logic tests |
| 11 | Secrets only from environment/secret manager; no secrets in repo, images, client bundles, or logs; rotated keys; separate dev/test/demo secrets | A02, A04 | AC, TS | Secret scanning in CI; config tests |
| 12 | TLS everywhere for deployed services (HSTS), TLS to DB; encryption at rest for DB/object storage; field-level encryption for most sensitive columns (notes, messages) optional | A04, A02; API8 | TS, IN | Deployment config check; HSTS test. Encrypted ePHI is still ePHI [S67] |
| 13 | Security headers (CSP, frame-ancestors, referrer-policy, permissions-policy), minimal CORS, error pages without stack traces | A02, A10; API8 | IN | Header scanner in CI |
| 14 | Structured error model that never leaks internals; fail closed on exceptions; no 200 on failure | A10 | IN | Error-path tests |
| 15 | PHI redaction in logs: allow-list logger fields; drop bodies; hash or omit identifiers in query strings; test that known synthetic PHI never appears in captured logs | A09, A02 | AU (without leaking), AC | Log snapshot tests with canary strings |
| 16 | Audit trail (AuditEvent model in 2.3): append-only, DB permissions without UPDATE/DELETE, hash chain, admin-only read; alerts on repeated denials, bulk reads, export, off-hours admin actions | A09; API9 | AU, IN | Tamper test; alert tests |
| 17 | AI boundary: only synthetic data to AI provider; prompt/response storage in AIGeneration with consent check; PII scrubber and allow-list of fields; output treated as untrusted (no HTML/script, no executing instructions), human review before clinical use; prompt-injection tests on notes/messages | A05, A06; API10 | AC | Red-team prompts; contract tests that AI service rejects non-allowed fields |
| 18 | Supply chain: lockfile, dependency audit, minimal dependencies, SBOM, pinned container digests, CI permissions least-privilege | A03, A08 | IN | `pnpm audit`, SBOM, Dependabot-style checks |
| 19 | FHIR import hardening: size/depth limits, reference allow-list, no external URL fetching (SSRF), attachment content-type allow-list, dry-run, admin-only, audit | A05, A08; API7, API10 | IN, AC | Malicious bundle corpus |
| 20 | Inventory and versioning: one OpenAPI document as source of truth, versioned routes, disabled debug endpoints, per-environment docs | A02; API9 | AC | OpenAPI diff in CI |
| 21 | Backup/restore with synthetic data only, tested restore; no production data in non-prod | A02 | IN | Restore drill (documented, scoped to demo) |
| 22 | Demo hygiene: synthetic-data banner, seeded accounts with unique demo passwords, public demo resets, no real email/SMS delivery to real addresses | A02, A06 | AC | Demo checklist |

Items to document in the threat model (brief section 14): trust boundaries (browser/mobile -> API; API -> DB; API -> AI service; API -> FHIR sandbox; admin -> import), attacker personas (curious clinician, malicious patient, cross-tenant admin, external attacker, malicious FHIR bundle, prompt injector), and abuse scenarios mapped to controls above.

---

## 11. Decisions and requirement revisions from this research

| # | Change | Reason |
|---|---|---|
| 1 | Add `Condition` model and derived `PractitionerRole` | Required by FHIR mapping and references [S4][S7] |
| 2 | Encounter only for synchronous visits; async review is not an Encounter | R4 separates scheduling (Appointment) from encounters; avoids storing planned data in Encounter [S13] |
| 3 | Export only signed ClinicalNotes; AI drafts never exported | US Core note semantics (final documents), safety of AI content [S47] |
| 4 | Pin one US Core version and verify with the validator | Conflicting versions observed [S41][S42][S45][S46][S48] |
| 5 | Describe FHIR work as "US Core-aligned data shapes"; no US Core server conformance claim | Server requirements (supportedProfile, searches) not implemented [S45][S47] |
| 6 | OAuth 2.0 + PKCE with SMART-style scopes; no "SMART on FHIR" claim until launch/discovery tested | SMART requires more than scopes [S57][S59] |
| 7 | Use local observation codes for TUG, Berg, LEFS, PSFS, chair-stand | No verified LOINC found [S26][S32][S38] |
| 8 | Patient pain control cannot be a drag-only slider | WCAG 2.5.7 [S74] |
| 9 | Sandbox: HAPI public server for synthetic-only demos; self-hosted Medplum for integration tests | HAPI test-data-only warning [S92]; Medplum hosted non-atomic transactions [S89] |

---

## 12. Open items for the next agent

- Re-fetch US Core STU9 profile pages (Patient, CarePlan, Observation profiles) with the IG package or the validator to settle Must Support lists and whether gender is mandatory.
- Confirm UCUM annotation for NRS (`{score}`) and degree units for ROM using the validator.
- Confirm Appointment.participant.status and Goal achievementStatus code sets; the pages read did not list them.
- Confirm the `@medplum/core` / `@medplum/fhirtypes` npm versions and licenses; npm pages were not reachable.
- Find or write the Synthea configuration used; check whether a rehabilitation/PT module exists.
- Confirm HL7 validator download URL and the `-ig` package id syntax for US Core on the pinned version.
- Decide ICD-10-CM vs SNOMED CT for Condition codes after licensing review.
- Fetch the HHS health-app developer scenarios PDF (the HTML page only links it) [S68].

---

## 13. Sources (all accessed 2026-11-19)

Limitations: several hl7.org pages (Practitioner, Organization, Goal, Appointment, AuditEvent, observation-status ValueSet, audit-event code systems on the `hl7.org` host, `us/core/history.html`, `STU9/...` paths) were refused by the site's robots policy for the fetch tool on some attempts. Where that happened the equivalent `*-definitions.html`, `*.profile.*`, `codesystem-*`, or `www.hl7.org` pages were used, and any element not visible is marked UNVERIFIED. Summaries were produced by the fetch tool's model from page content, so quotations are paraphrases unless noted. Tx-server lookups use LOINC 2.82 or 2.83 content.

| ID | Source | URL | Accessed |
|---|---|---|---|
| S1 | FHIR R4 Patient | https://hl7.org/fhir/R4/patient.html | 2026-11-19 |
| S2 | FHIR R4 Practitioner definitions | https://hl7.org/fhir/R4/practitioner-definitions.html | 2026-11-19 |
| S3 | FHIR R4 Organization profile | https://hl7.org/fhir/R4/organization.profile.xml.html | 2026-11-19 |
| S4 | FHIR R4 CarePlan | https://hl7.org/fhir/R4/careplan.html | 2026-11-19 |
| S5 | FHIR R4 Observation | https://hl7.org/fhir/R4/observation.html | 2026-11-19 |
| S6 | FHIR R4 observation-status code system | https://hl7.org/fhir/R4/codesystem-observation-status.html | 2026-11-19 |
| S7 | FHIR R4 Condition | https://hl7.org/fhir/R4/condition.html | 2026-11-19 |
| S8 | FHIR R4 Goal definitions | https://hl7.org/fhir/R4/goal-definitions.html | 2026-11-19 |
| S9 | FHIR R4 Goal status value set | https://hl7.org/fhir/R4/valueset-goal-status.html | 2026-11-19 |
| S10 | FHIR R4 Appointment definitions | https://hl7.org/fhir/R4/appointment-definitions.html | 2026-11-19 |
| S11 | FHIR R4 Appointment status value set | https://hl7.org/fhir/R4/valueset-appointmentstatus.html | 2026-11-19 |
| S12 | FHIR R4 Appointment canonical profile (constraints) | https://hl7.org/fhir/R4/appointment.profile.canonical.json | 2026-11-19 |
| S13 | FHIR R4 Encounter | https://hl7.org/fhir/R4/encounter.html | 2026-11-19 |
| S14 | FHIR R4 Encounter status value set | https://hl7.org/fhir/R4/valueset-encounter-status.html | 2026-11-19 |
| S15 | FHIR R4 DocumentReference | https://hl7.org/fhir/R4/documentreference.html | 2026-11-19 |
| S16 | FHIR R4 Bundle | https://hl7.org/fhir/R4/bundle.html | 2026-11-19 |
| S17 | FHIR R4 Consent | https://hl7.org/fhir/R4/consent.html | 2026-11-19 |
| S18 | FHIR R4 AuditEvent | https://www.hl7.org/fhir/R4/auditevent.html | 2026-11-19 |
| S19 | FHIR R4 AuditEvent definitions | https://hl7.org/fhir/R4/auditevent-definitions.html | 2026-11-19 |
| S20 | FHIR R4 audit-event-action code system | https://www.hl7.org/fhir/R4/codesystem-audit-event-action.html | 2026-11-19 |
| S21 | FHIR R4 audit-event-outcome code system | https://www.hl7.org/fhir/R4/codesystem-audit-event-outcome.html | 2026-11-19 |
| S22 | FHIR R4 Provenance | https://hl7.org/fhir/R4/provenance.html | 2026-11-19 |
| S23 | FHIR R4 license | https://hl7.org/fhir/R4/license.html | 2026-11-19 |
| S24 | HL7 tx server lookup LOINC 72514-3 | https://tx.fhir.org/r4/CodeSystem/$lookup?system=http://loinc.org&code=72514-3&_format=json | 2026-11-19 |
| S25 | LOINC 72514-3 page | https://loinc.org/72514-3 | 2026-11-19 |
| S26 | tx expand filter "timed up and go" | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=timed+up+and+go&count=15&_format=json | 2026-11-19 |
| S27 | tx expand filter "6 minute walk" | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=6+minute+walk&count=15&_format=json | 2026-11-19 |
| S28 | tx expand filter "PROMIS physical function" | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=PROMIS+physical+function&count=15&_format=json | 2026-11-19 |
| S29 | tx expand filter "gait speed" | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=gait+speed&count=15&_format=json | 2026-11-19 |
| S30 | tx expand filter "Oswestry" | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=Oswestry&count=15&_format=json | 2026-11-19 |
| S31 | tx expand filter "pain severity" | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=pain+severity&count=20&_format=json | 2026-11-19 |
| S32 | tx expand filter "chair stand" | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=chair+stand&count=15&_format=json | 2026-11-19 |
| S33 | tx expand filter "range of motion knee flexion" | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=range+of+motion+knee+flexion&count=15&_format=json | 2026-11-19 |
| S34 | tx lookup LOINC 38208-5 | https://tx.fhir.org/r4/CodeSystem/$lookup?system=http://loinc.org&code=38208-5&_format=json | 2026-11-19 |
| S35 | tx lookup LOINC 11506-3 | https://tx.fhir.org/r4/CodeSystem/$lookup?system=http://loinc.org&code=11506-3&_format=json | 2026-11-19 |
| S36 | tx lookup LOINC 91721-1 | https://tx.fhir.org/r4/CodeSystem/$lookup?system=http://loinc.org&code=91721-1&_format=json | 2026-11-19 |
| S37 | LOINC license | https://loinc.org/license/ | 2026-11-19 |
| S38 | tx expand filters returning no concepts (Berg balance, LEFS, lower extremity functional scale, patient specific functional scale) | https://tx.fhir.org/r4/ValueSet/$expand?url=http://loinc.org/vs&filter=Berg+balance (and `filter=LEFS`, `filter=lower+extremity+functional+scale`, `filter=patient+specific+functional+scale`) | 2026-11-19 |
| S39 | tx lookup v3-ActCode AMB | https://tx.fhir.org/r4/CodeSystem/$lookup?system=http://terminology.hl7.org/CodeSystem/v3-ActCode&code=AMB&_format=json | 2026-11-19 |
| S40 | tx lookup v3-ActCode VR | https://tx.fhir.org/r4/CodeSystem/$lookup?system=http://terminology.hl7.org/CodeSystem/v3-ActCode&code=VR&_format=json | 2026-11-19 |
| S41 | US Core IG home | https://hl7.org/fhir/us/core/ | 2026-11-19 |
| S42 | US Core version history | https://www.hl7.org/fhir/us/core/version-history.html | 2026-11-19 |
| S43 | HL7 announcement: US Core 9.0.0 STU publication | https://standups.hl7.org/2026/05/30/stu-publication-of-hl7-fhir-implementation-guide-us-core-edition-9-0-0-us-realm/ | 2026-11-19 |
| S44 | US Core Patient profile | https://hl7.org/fhir/us/core/StructureDefinition-us-core-patient.html | 2026-11-19 |
| S45 | US Core general requirements | https://hl7.org/fhir/us/core/general-requirements.html | 2026-11-19 |
| S46 | US Core CarePlan profile | https://hl7.org/fhir/us/core/StructureDefinition-us-core-careplan.html | 2026-11-19 |
| S47 | US Core DocumentReference profile | https://hl7.org/fhir/us/core/StructureDefinition-us-core-documentreference.html | 2026-11-19 |
| S48 | US Core Encounter profile | https://hl7.org/fhir/us/core/StructureDefinition-us-core-encounter.html | 2026-11-19 |
| S49 | US Core Goal profile | https://hl7.org/fhir/us/core/StructureDefinition-us-core-goal.html | 2026-11-19 |
| S50 | US Core Condition (problems and health concerns) | https://hl7.org/fhir/us/core/StructureDefinition-us-core-condition-problems-health-concerns.html | 2026-11-19 |
| S51 | US Core Observation Screening Assessment | https://hl7.org/fhir/us/core/StructureDefinition-us-core-observation-screening-assessment.html | 2026-11-19 |
| S52 | US Core Observation Clinical Result | https://hl7.org/fhir/us/core/StructureDefinition-us-core-observation-clinical-result.html | 2026-11-19 |
| S53 | US Core clinical notes guidance | https://hl7.org/fhir/us/core/clinical-notes.html | 2026-11-19 |
| S54 | US Core Practitioner profile | https://hl7.org/fhir/us/core/StructureDefinition-us-core-practitioner.html | 2026-11-19 |
| S55 | US Core Organization profile | https://hl7.org/fhir/us/core/StructureDefinition-us-core-organization.html | 2026-11-19 |
| S56 | US Core Provenance profile | https://hl7.org/fhir/us/core/StructureDefinition-us-core-provenance.html | 2026-11-19 |
| S57 | SMART App Launch IG home | https://hl7.org/fhir/smart-app-launch/ | 2026-11-19 |
| S58 | SMART scopes and launch context | https://hl7.org/fhir/smart-app-launch/scopes-and-launch-context.html | 2026-11-19 |
| S59 | SMART app launch (flows, PKCE, security) | https://hl7.org/fhir/smart-app-launch/app-launch.html | 2026-11-19 |
| S60 | RFC 6749 OAuth 2.0 | https://datatracker.ietf.org/doc/html/rfc6749 | 2026-11-19 |
| S61 | OAuth 2.1 draft (draft-ietf-oauth-v2-1) | https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/ | 2026-11-19 |
| S62 | HHS HIPAA Security Rule | https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html | 2026-11-19 |
| S63 | HHS HIPAA Privacy Rule | https://www.hhs.gov/hipaa/for-professionals/privacy/laws-regulations/index.html | 2026-11-19 |
| S64 | HHS de-identification guidance | https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html | 2026-11-19 |
| S65 | HHS minimum necessary | https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/minimum-necessary-requirement/index.html | 2026-11-19 |
| S66 | HHS Security Rule guidance index | https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html | 2026-11-19 |
| S67 | HHS cloud computing guidance | https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html | 2026-11-19 |
| S68 | HHS health apps page | https://www.hhs.gov/hipaa/for-professionals/special-topics/health-apps/index.html | 2026-11-19 |
| S69 | HHS regulatory initiatives (Security Rule NPRM status) | https://www.hhs.gov/hipaa/for-professionals/regulatory-initiatives | 2026-11-19 |
| S70 | WCAG 2.2 Recommendation | https://www.w3.org/TR/WCAG22/#whats-new-in-wcag-2-2 | 2026-11-19 |
| S71 | WAI: what is new in WCAG 2.2 | https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ | 2026-11-19 |
| S72 | Understanding 2.5.8 Target Size (Minimum) | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | 2026-11-19 |
| S73 | Understanding 3.3.8 Accessible Authentication (Minimum) | https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html | 2026-11-19 |
| S74 | Understanding 2.5.7 Dragging Movements | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html | 2026-11-19 |
| S75 | Understanding 2.4.11 Focus Not Obscured (Minimum) | https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html | 2026-11-19 |
| S76 | Understanding 3.3.7 Redundant Entry | https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html | 2026-11-19 |
| S77 | OWASP Top 10:2025 | https://top10.owasp.org/2025/ | 2026-11-19 |
| S78 | OWASP API Security Top 10 2023 | https://api-security.owasp.org/editions/2023/en/0x11-t10/ | 2026-11-19 |
| S79 | OWASP ASVS home | https://asvs.owasp.org/ | 2026-11-19 |
| S80 | OWASP ASVS 5.0 "Using ASVS" | https://github.com/OWASP/ASVS/blob/master/5.0/en/0x03-Using-ASVS.md | 2026-11-19 |
| S81 | Synthea repository | https://github.com/synthetichealth/synthea | 2026-11-19 |
| S82 | Synthea basic setup wiki | https://github.com/synthetichealth/synthea/wiki/Basic-Setup-and-Running | 2026-11-19 |
| S83 | Synthea common configuration wiki | https://github.com/synthetichealth/synthea/wiki/Common-Configuration | 2026-11-19 |
| S84 | Synthea releases | https://github.com/synthetichealth/synthea/releases | 2026-11-19 |
| S85 | Synthea HL7 FHIR wiki | https://github.com/synthetichealth/synthea/wiki/HL7-FHIR | 2026-11-19 |
| S86 | HAPI/HL7 FHIR core repository (validator) | https://github.com/hapifhir/org.hl7.fhir.core | 2026-11-19 |
| S87 | Using the FHIR Validator (HL7 Confluence) | https://confluence.hl7.org/display/FHIR/Using+the+FHIR+Validator | 2026-11-19 |
| S88 | Medplum repository | https://github.com/medplum/medplum | 2026-11-19 |
| S89 | Medplum batch/transaction docs | https://www.medplum.com/docs/fhir-datastore/fhir-batch-requests | 2026-11-19 |
| S90 | Medplum `validateResource` API doc | https://www.medplum.com/docs/sdk/core.validateresource | 2026-11-19 |
| S91 | Medplum profiles/US Core validation doc | https://www.medplum.com/docs/fhir-datastore/profiles | 2026-11-19 |
| S92 | HAPI public FHIR test server | https://hapi.fhir.org/ | 2026-11-19 |
| S93 | fhir.resources (PyPI) | https://pypi.org/project/fhir.resources/ | 2026-11-19 |
| S94 | HAPI core releases (latest tag 7.0.3 seen; asset names not visible) | https://github.com/hapifhir/org.hl7.fhir.core/releases/latest | 2026-11-19 |

Not cited as authority: a web-search result titled "Feds push back HIPAA security rule overhaul to July 2027" (Fierce Healthcare) suggests rule timing slipped; it was not fetched and is secondary, so it is mentioned here only as a lead to check.
