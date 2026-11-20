# FHIR validation and import (WP 5.4 batch 1, WP 5.4b batch 2)

Synthetic data only; not for clinical use. Every number below comes from a recorded run on 2026-11-20 in this repository: `scripts/gate-wp-5.4b.sh` (which extends `scripts/gate-wp-5.4.sh`; the measured values are in `docs/evaluation/fhir-validation.json`, written by `packages/fhir/test/evaluation.test.ts` through `FHIR_EVAL_OUT`) and `pnpm synthea:demo`. They are measurements, not targets. Ten resource types are mapped: Organization, Practitioner, Patient, Goal, CarePlan, Observation (batch 1) and Condition, Appointment, Encounter, DocumentReference (batch 2).

Claim wording: CarePath writes **US Core-aligned shapes, validated by CarePath's defined checks**. It does not claim US Core conformance, profile validation, a conformant FHIR server or SMART on FHIR.

## Official HL7 validator: not performed

Official validation not performed. The one bounded attempt (advisor plan revision 1) on 2026-11-20 looked for the `hl7.fhir.r4.core` 4.0.1 and `hl7.fhir.us.core` 6.1.0 packages on other hosts:

| Source | Result |
|---|---|
| `hl7.org/fhir/R4/hl7.fhir.r4.core.tgz`, `hl7.org/fhir/us/core/STU6.1/package.tgz` | Refused by the egress proxy (HTTP 403, "no rule or network setting allows this host") |
| `packages.simplifier.net` (R4 core, US Core 6.1.0) | Refused by the egress proxy |
| `repo1.maven.org` (HAPI validation resources) | Refused by the egress proxy |
| `github.com/HL7/US-Core/releases` | HTTP 403 |
| npm registry `hl7.fhir.r4.core`, `hl7.fhir.us.core` | Only a `0.0.1-security` placeholder each. Third-party repackagings exist on npm; they were not used, because their provenance cannot be checked here |

`packages.fhir.org`, `packages2.fhir.org` and `build.fhir.org` were already refused in the tooling probe (`docs/decisions/tooling-probe.md` section 4). Without the packages the validator jar cannot validate, so no output has been checked by the official HL7 validator. This holds for the batch 2 resources too; WP 5.4b made no new attempt.

## The three layers

1. **Structural**: `@medplum/core` 5.2.18 `validateResource` against the base R4 StructureDefinitions in `@medplum/definitions` 5.2.18. No profiles are loaded. Medplum's warning on every `urn:uuid:` reference ("cannot check the target type") is dropped, because layer 2 checks those targets with the bundle.
2. **CarePath checks** (`packages/fhir/src/validate/carepath.ts`): Bundle rules bdl-3, bdl-7, bdl-8 and a fullUrl on every collection entry; required elements per mapped resource (US Core 6.1.0 is pinned in `packages/fhir/src/config.ts`, but the element lists were read from 7.0.0 to 9.0.0 pages, so differences against 6.1.0 are unverified); required-binding codes (the batch 2 value sets were checked against the R4 definitions shipped in `@medplum/definitions`: condition-clinical, condition-ver-status, appointmentstatus, participationstatus, encounter-status, document-reference-status, composition-status, document-relationship-type); cpl-3, us-core-2, us-core-17 (NPI check digit; read from the 9.0.0 Practitioner page, not verified for 6.1.0) and the pain scale range; batch 2 invariants con-3 (warning), con-4, con-5, app-1 to app-4, per-1 on Encounter.period, us-core-6, and a custodian on every DocumentReference (US Core asks for a responsible organization through custodian or Provenance; CarePath writes no Provenance); reference resolution, allowed target types, `Reference.type` agreement and the organization boundary. Two rules apply to what CarePath itself sends (export and the standalone check, not import): an Encounter is a visit that took place (class AMB or VR from v3 ActCode; status in-progress, finished or entered-in-error) and a DocumentReference is a signed note (docStatus final or amended, an authenticator, and an amendment that replaces the version before it).
3. **Duplicates**: identifier system and value first, then a natural key (patient: family, given, birth date, gender; practitioner: family, given, staff id; goal: patient, description, start date; care plan: patient, title, published time, version number; observation: patient, code, effective time, value at two decimals; condition: patient, code system, code, onset date, recorded time; appointment: patient, practitioner, start, created time; encounter: patient, start, class, type; document reference: patient, note type, signature time, SHA-256 of the note text).

`meta.profile` is never written.

## Batch 2 mappings

| CarePath | FHIR | Shape |
|---|---|---|
| `Condition` | Condition | category (`problem-list-item`, `encounter-diagnosis` from R4 condition-category; `health-concern` from the US Core code system, whose URL is not in the local definitions and is unverified), code with the system it came with (CarePath synthetic codes, SNOMED CT from Synthea; no terminology bundled), clinicalStatus (absent when entered in error, con-5), verificationStatus, bodySite text, encounter, onset and abatement as date-precision dateTimes, recordedDate, recorder, note |
| `Appointment` | Appointment | status per research HD section 3.1 (requested to proposed, booked, checked_in to checked-in, in_progress to arrived, completed to fulfilled, both cancellations to cancelled, no_show to noshow); cancelationReason only on cancelled and noshow (app-4), its coding `pat` or `prov` (R4 appointment-cancellation-reason) saying who cancelled and its text the reason; appointmentType in a local code system; start and end always written (app-2, app-3); patient and practitioner participants with a participation status; the booking time zone in a local extension. Appointment.slot is not written (Slot is not mapped) |
| `Encounter` | Encounter | only visits that took place: class AMB or VR, status in-progress, finished or entered-in-error, period = actual times, participant = the practitioner, appointment, serviceProvider = the clinic. The type keeps its system: CarePath visit types use a local system; an imported SNOMED CT type is stored as `system|code` in the existing type column. The transcript is not exported |
| `ClinicalNote` + `ClinicalNoteVersion` | DocumentReference | one per signed version (`signedNoteDocuments`): the version that was signed (docStatus final), then each amendment (docStatus amended, relatesTo replaces the version before it). The newest is current, earlier ones superseded, every version of a note entered in error is entered-in-error. Drafts, AI drafts and never-signed notes are not read by the export at all. Type LOINC 11506-3 (progress note) or 34117-2 (initial evaluation); category `clinical-note` (US Core code system, URL unverified locally); author and authenticator = the signing author; custodian = the clinic; context.encounter; content = the SOAP text as inline base64 `text/plain`; version number and amendment reason in local extensions. AI involvement is not exported |

Batch 2 also writes the links batch 1 held back: Goal.addresses (Condition) and Observation.encounter. Both resolve inside the export, because every condition and encounter of the patient is in it.

Import writes Encounter (AMB and VR only; other classes and statuses are skipped and reported as `map.encounter.class.skipped` or `map.encounter.status.skipped`) and Condition. Appointment and DocumentReference are export only: bookings belong to scheduling (slots, overlap constraints, reminders), and a note becomes signed only by its author inside CarePath. Import skips them with `import.skipped-type` and says why.

Dependency on WP 5.2: the DocumentReference mapping reads main's `ClinicalNote` (status, signedAt, signedByPractitionerId) and `ClinicalNoteVersion` (isAmendment, amendmentReason). WP 5.2's branch adds `enteredInErrorAt`, `enteredInErrorReason` and `enteredInErrorByUserId` and does not change the signing model (signed note takes amendments only, signer is the author), so the mapping holds after it merges; the entered-in-error reason is not exported.

## Round trip per resource

Record to FHIR, layers 1 and 2 on the resource alone, FHIR back to a record, and that record to FHIR again (`packages/fhir/test/roundtrip.test.ts` and `evaluation.test.ts`).

| Resource | Sample records | Pass layers 1 and 2 | Record equal after round trip | FHIR equal after second mapping |
|---|---|---|---|---|
| Organization | 1 | 1 | 1 | 1 |
| Practitioner | 2 | 2 | 2 | 2 |
| Patient | 1 | 1 | 1 | 1 |
| Goal | 2 | 2 | 2 | 2 |
| CarePlan | 2 | 2 | 2 | 2 |
| Observation | 5 | 5 | 5 | 5 |
| Condition | 3 | 3 | 3 | 3 |
| Appointment | 6 | 6 | 6 | 6 |
| Encounter | 2 | 2 | 2 | 2 |
| DocumentReference | 3 | 3 | 3 | 3 |

Samples: Condition (active problem-list item with a local code, resolved encounter diagnosis with a SNOMED CT code, entered-in-error health concern); Appointment (completed, cancelled by the patient, booked video visit, no-show, cancelled by the clinic, requested); Encounter (finished in-person visit linked to its appointment, in-progress video visit with a SNOMED CT type); DocumentReference (the signed version and the amendment of one note, and a note signed then entered in error; a second note left as a draft produces nothing).

The sample export Bundle (27 entries) passes all three layers with 0 errors and 0 warnings. Every reference in it resolves to an entry, and referenced entries precede the entries that reference them.

Through the API (`apps/api/test/phase5/fhir.test.ts`), the export of a fixture patient with two plan versions, a goal, two check-ins, a completed appointment with its encounter, a condition, a signed and amended note and a draft note has zero dangling references and passes all three layers; it carries two DocumentReferences (superseded final, current amended) and no id of the draft note or its version. The route itself refuses to send a Bundle that fails them.

Seeded database (`scripts/fhir-export-check.ts` in the gate, small seed profile): all 40 patients exported, 0 bundles failing the three layers; entries 40 Organization, 39 Practitioner, 40 Patient, 90 Appointment, 8 Encounter, 27 Condition, 39 Goal, 63 CarePlan, 328 Observation, 6 DocumentReference; 3 unsigned notes in the database and 0 draft version ids in any export. With the Practitioner mapping as batch 1 left it, 36 of these 40 exports failed `us-core-17`: the seed's fictitious NPIs (`9…`) fail the check digit, so the export route answers 500 for those patients. Batch 1 exports of seeded patients whose plans or observations name such a practitioner fail the same way on main (not measured separately; the batch 1 API tests use fixture practitioners without an NPI). An NPI that fails the check digit is now left out of the export (the staff identifier remains); the seed itself is unchanged.

## Deliberately broken fixtures

55 fixtures in `packages/fhir/test/fixtures/broken/` (31 from batch 1, 24 added for batch 2, generated from the batch 2 sample export with one change each). Each must fail, with its expected rule among the errors, an `expression` that starts with `Bundle`, and an OperationOutcome issue naming the rule. Columns count errors per layer for that fixture. Status applies to the three import fixtures.

| Fixture | Expected rule | Fails with it | Layer 1 errors | Layer 2 errors | Layer 3 errors | Import status |
|---|---|---|---|---|---|---|
| appointment-cancel-reason-while-booked | `app-4` | yes | 1 | 1 | 0 | n/a |
| appointment-missing-participant | `appointment.participant` | yes | 1 | 1 | 0 | n/a |
| appointment-participant-actor-goal | `ref.target-type` | yes | 0 | 1 | 0 | n/a |
| appointment-start-without-end | `app-2` | yes | 1 | 2 | 0 | n/a |
| appointment-status-not-a-code | `code.appointment.status` | yes | 0 | 1 | 0 | n/a |
| bundle-duplicate-fullurl | `bdl-7` | yes | 0 | 5 | 0 | n/a |
| bundle-duplicate-patient | `dup.in-bundle` | yes | 0 | 0 | 1 | n/a |
| bundle-entry-without-fullurl | `bundle.fullUrl` | yes | 0 | 2 | 0 | n/a |
| bundle-foreign-identifier | `org.boundary.identifier` | yes | 0 | 1 | 0 | n/a |
| bundle-not-a-bundle | `bundle.resource-type` | yes | 0 | 1 | 0 | n/a |
| bundle-request-in-collection | `bdl-3` | yes | 0 | 1 | 0 | n/a |
| bundle-versioned-fullurl | `bdl-8` | yes | 0 | 2 | 0 | n/a |
| careplan-activity-reference-and-detail | `cpl-3` | yes | 1 | 1 | 0 | n/a |
| careplan-missing-assess-plan | `uscore.careplan.category` | yes | 0 | 1 | 0 | n/a |
| careplan-missing-intent | `r4.structure` | yes | 1 | 1 | 0 | n/a |
| careplan-subject-practitioner | `ref.target-type` | yes | 0 | 1 | 0 | n/a |
| condition-abatement-while-active | `con-4` | yes | 1 | 1 | 0 | n/a |
| condition-clinical-status-not-a-code | `code.condition.clinicalStatus` | yes | 0 | 1 | 0 | n/a |
| condition-entered-in-error-with-clinical-status | `con-5` | yes | 1 | 1 | 0 | n/a |
| condition-missing-category | `uscore.condition.category` | yes | 0 | 1 | 0 | n/a |
| docref-amendment-without-replaces | `carepath.note.amendment-replaces` | yes | 0 | 1 | 0 | n/a |
| docref-attachment-without-data | `us-core-6` | yes | 0 | 1 | 0 | n/a |
| docref-missing-content-type | `uscore.documentreference.contentType` | yes | 0 | 1 | 0 | n/a |
| docref-missing-custodian | `carepath.documentreference.custodian` | yes | 0 | 1 | 0 | n/a |
| docref-preliminary-draft | `carepath.note.signed` | yes | 0 | 1 | 0 | n/a |
| docref-relates-to-observation | `ref.target-type` | yes | 0 | 1 | 0 | n/a |
| docref-replaces-dangling | `ref.dangling` | yes | 0 | 1 | 0 | n/a |
| docref-status-not-a-code | `code.documentreference.status` | yes | 0 | 1 | 0 | n/a |
| encounter-emergency-class | `carepath.encounter.class` | yes | 0 | 1 | 0 | n/a |
| encounter-missing-class | `r4.structure` | yes | 1 | 2 | 0 | n/a |
| encounter-missing-type | `uscore.encounter.type` | yes | 0 | 1 | 0 | n/a |
| encounter-participant-patient | `ref.target-type` | yes | 0 | 1 | 0 | n/a |
| encounter-period-reversed | `per-1` | yes | 0 | 1 | 0 | n/a |
| encounter-planned | `carepath.encounter.occurred` | yes | 0 | 1 | 0 | n/a |
| goal-missing-description | `uscore.goal.description` | yes | 1 | 1 | 0 | n/a |
| goal-status-not-a-code | `code.goal.lifecycleStatus` | yes | 0 | 1 | 0 | n/a |
| import-encounter-practitioner-unknown | `ref.unresolved` | yes | 0 | 1 | 0 | 422 |
| import-patient-exists | `dup.existing` | yes | 0 | 0 | 1 | 409 |
| import-reference-outside-organization | `ref.unresolved` | yes | 0 | 1 | 0 | 422 |
| observation-dangling-subject | `ref.dangling` | yes | 0 | 1 | 0 | n/a |
| observation-encounter-not-an-encounter | `ref.target-type` | yes | 0 | 1 | 0 | n/a |
| observation-missing-status | `r4.structure` | yes | 1 | 1 | 0 | n/a |
| observation-no-value | `us-core-2` | yes | 0 | 1 | 0 | n/a |
| observation-pain-out-of-range | `carepath.pain-nrs-range` | yes | 0 | 1 | 0 | n/a |
| observation-reference-type-mismatch | `ref.type-mismatch` | yes | 0 | 1 | 0 | n/a |
| observation-status-not-a-code | `code.observation.status` | yes | 0 | 1 | 0 | n/a |
| observation-value-and-absent-reason | `r4.invariant` | yes | 1 | 0 | 0 | n/a |
| organization-missing-name | `uscore.organization.name` | yes | 0 | 1 | 0 | n/a |
| patient-birthdate-malformed | `r4.structure` | yes | 1 | 0 | 0 | n/a |
| patient-gender-not-a-code | `code.patient.gender` | yes | 0 | 1 | 0 | n/a |
| patient-missing-gender | `uscore.patient.gender` | yes | 0 | 1 | 0 | n/a |
| patient-missing-identifier | `uscore.patient.identifier` | yes | 0 | 1 | 0 | n/a |
| patient-missing-name | `uscore.patient.name` | yes | 0 | 1 | 0 | n/a |
| patient-unknown-element | `r4.structure` | yes | 1 | 0 | 0 | n/a |
| practitioner-npi-check-digit | `us-core-17` | yes | 0 | 1 | 0 | n/a |

Result: 55 of 55 fail with the expected rule. Layer 1 alone flags 13 of the 55 (7 of the 31 batch 1 fixtures, 6 of the 24 batch 2 fixtures).

What this shows about layer 1, from these fixtures only: Medplum caught missing required elements (`CarePlan.intent`, `Observation.status`, `Goal.description`, `Appointment.participant`, `Encounter.class`), a malformed date, an unknown element, and the invariants obs-6, cpl-3, app-2, app-4, con-4 and con-5. It did not flag codes outside a required binding (`Patient.gender = "banana"`, `Goal.lifecycleStatus = "paused"`, `Observation.status = "done"`, `Appointment.status = "confirmed"`, `DocumentReference.status = "signed"`, a clinicalStatus code `better`), an Encounter period that ends before it starts (per-1), reference target types behind `urn:uuid:` references, or any US Core or CarePath rule (no profiles are loaded). Those are caught by layer 2 only. The fixture set is small and was written by the same worker as the checks; it measures these cases, not general coverage.

## Synthea import

Generation: `pnpm synthea:demo`, recorded in `packages/fhir/fixtures/synthea/manifest.json`: Synthea `master-branch-latest` jar (sha256 `20098ec70c24c715ea874b19140983634711cc4986196105b5b0a9ca72a4b644`), OpenJDK 21.0.13, seed 20261120, clinician seed 20261120, reference date 2026-11-01, population 3, ages 40 to 70, Arizona, one year of history, US Core 6.1.0 export, and Claim, ExplanationOfBenefit, DiagnosticReport, DocumentReference, SupplyDelivery and ImagingStudy excluded to keep the fixtures small. Two runs produced byte-identical bundles, and the `pnpm synthea:demo` run on 2026-11-20 reported all four generated files identical to the committed fixtures. The committed files are the three patient bundles (transaction bundles) and the practitioner bundle (batch); the hospital bundle is not committed because import never creates organizations.

Import through `POST /fhir/import` (`app.inject`, seeded clinic admin, fresh database with the small seed), from the `pnpm synthea:demo` run on 2026-11-20 after batch 2 (the generated bundles were again byte-identical to the committed fixtures), with Encounter and Condition now on the allow-list:

| File | Entries | HTTP | Patient created | Practitioner created | Encounter created / skipped | Condition created / skipped | CarePlan created / skipped | Observation created / skipped | Other types skipped |
|---|---|---|---|---|---|---|---|---|---|
| practitioners.json | 22 | 201 | 0 | 11 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 11 (PractitionerRole) |
| patient-1.json | 106 | 201 | 1 | 0 | 15 / 3 | 16 / 0 | 1 / 1 | 9 / 38 | 22 |
| patient-2.json | 94 | 201 | 1 | 0 | 15 / 1 | 17 / 0 | 1 / 1 | 10 / 12 | 36 |
| patient-3.json | 144 | 201 | 1 | 0 | 17 / 3 | 21 / 0 | 3 / 3 | 13 / 43 | 40 |
| Total | 366 | | 3 | 11 | 47 / 7 | 54 / 0 | 5 / 5 | 32 / 93 | 109 |

Batch 1 skipped 217 entries of other types; 54 Encounters and 54 Conditions of those are now mapped. Of the 47 imported encounters, 46 are AMB and 1 is VR; the 7 skipped are 3 inpatient (IMP) and 4 emergency (EMER) visits, which CarePath does not record. Every imported encounter keeps its SNOMED CT type and the practitioner found through Synthea's conditional NPI reference. Links kept on import (in-memory planner over the same files): 47 of 54 conditions and 31 of 32 observations point at an imported encounter; the others name an encounter that was not imported or none, so the link is left empty. 9 conditions are resolved (with an abatement date), the rest active.

Re-importing patient-1.json afterwards answered 409 with 42 `dup.existing` issues (1 patient, 1 care plan, 9 observations, 15 encounters, 16 conditions) and wrote nothing (batch 1: 11). The same counts come out of the in-memory planner run in the gate.

Why records were skipped, from the itemised reports (patient-1, patient-2, patient-3):

| Reason (rule) | Count | Meaning |
|---|---|---|
| `import.skipped-type` | 22, 36, 40 | Resource type outside the allow-list (Procedure, MedicationRequest, CareTeam, Device, Immunization, Provenance and others). Batch 1 skipped 56, 69, 81: Encounter and Condition are now imported |
| `map.encounter.class.skipped` | 3, 1, 3 | Inpatient and emergency encounters: CarePath records in-person (AMB) and video (VR) visits only |
| `import.reference-dropped` (information) | 36, 32, 40 | References to types that are not imported (Location, Organization by Synthea identifier, Appointment and others) on resources that now get mapped; the reference is dropped, the resource is kept |
| `map.observation.category.skipped` | 36, 10, 41 | Laboratory and social-history observations: CarePath stores survey, activity, exam and vital-signs only |
| `map.observation.value.skipped` | 2, 2, 2 | Panels with components and no value of their own (for example blood pressure) |
| `import.careplan.open-exists` | 1, 1, 3 | A second open plan for the same patient; CarePath keeps one open plan per patient |
| `map.careplan.activity.not-exercise` | 4, 6, 13 | SNOMED activities, not CarePath exercises: the plan is imported without them |
| `import.derived-practitioner` (information) | 49, 24, 62 | Synthea writes no `Observation.performer` or `CarePlan.author`; the practitioner of the referenced Encounter was used, found through Synthea's conditional reference `Practitioner?identifier=http://hl7.org/fhir/sid/us-npi|...` against the imported practitioners |

Without the practitioner bundle imported first, a patient bundle fails with 422 (`map.observation.performer`), because no performer can be derived (`packages/fhir/test/import.test.ts`).

## Import behaviour checked by tests

- Failure answers: 400 (not a Bundle, bdl-7, malformed date, Encounter without class), 422 (pain out of range, wrong subject type, unresolved reference, NPI check digit, Condition without category, Encounter practitioner the organization does not have), 409 (duplicates with `onDuplicate=reject`, the default). Each answers with an itemised OperationOutcome, writes nothing, and records an `import.fhir` event with outcome `minor_failure` and `detailCode` `rejected_<status>`.
- Success writes records and the `import.fhir` event in one transaction; ids are new; references are remapped (including Observation.encounter, Condition.encounter and Goal.addresses to the new encounter and condition). Importing another organization's CarePath export creates its encounter and condition and skips its appointments and DocumentReferences.
- A relative reference to another organization's patient answers 422 with a body identical to the one for an id that does not exist.
- Export is allowed to therapists and admins (`fhir.export`) and to a patient for their own record (`fhir.export_own`); the coordinator gets 403, another organization 404 with `security.access_denied`. M8 enumerates the export route.

## Known limits

- Observation values are stored as Decimal(10, 2): a Synthea temperature of 37.967 is stored as 37.97. Natural keys compare at two decimals so a re-import still matches.
- Performer and author derived from the encounter practitioner are an import decision, reported per resource; they are not in the source data.
- CarePlan.addresses (Condition) is neither written nor read; Goal.addresses carries the condition link. Appointment.slot and the reschedule link between appointments are not exported. CarePlan versions carry the CarePath version number in a local extension (`urn:carepath:extension:care-plan-version-number`) and exercise doses in another (`urn:carepath:extension:exercise-dose`).
- Goal.achievementStatus is exported as text only; the goal-achievement code system was not verified.
- Planning reads before the write transaction starts; two imports of the same bundle at the same moment are not serialized, and a unique-key collision then answers 409 `already_exists`.
- Imported patients have no login and no care team; their status is `awaiting_assignment`.
- An imported Condition without recordedDate is stored with the import time (the column is required); none of the Synthea conditions lacked one. One without verificationStatus is stored as unconfirmed and reported (`map.condition.verification-defaulted`).
- A note's text is split back into its four sections by the `Subjective:`, `Objective:`, `Assessment:`, `Plan:` headings; a section whose own text contains a blank line followed by the next heading would split wrongly. Notes are not imported, so this affects only the round trip.
- The US Core code systems for `clinical-note` and `health-concern` are written from memory of the US Core pages, not checked against a package (the packages could not be fetched).
