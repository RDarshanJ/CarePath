# FHIR validation and import (WP 5.4, batch 1)

Synthetic data only; not for clinical use. Every number below comes from a recorded run on 2026-11-20 in this repository: `scripts/gate-wp-5.4.sh` (which writes the measured values to the JSON in `docs/evaluation/fhir-validation.json` through `FHIR_EVAL_OUT`) and `pnpm synthea:demo`. They are measurements, not targets.

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

`packages.fhir.org`, `packages2.fhir.org` and `build.fhir.org` were already refused in the tooling probe (`docs/decisions/tooling-probe.md` section 4). Without the packages the validator jar cannot validate, so no output has been checked by the official HL7 validator.

## The three layers

1. **Structural**: `@medplum/core` 5.2.18 `validateResource` against the base R4 StructureDefinitions in `@medplum/definitions` 5.2.18. No profiles are loaded. Medplum's warning on every `urn:uuid:` reference ("cannot check the target type") is dropped, because layer 2 checks those targets with the bundle.
2. **CarePath checks** (`packages/fhir/src/validate/carepath.ts`): Bundle rules bdl-3, bdl-7, bdl-8 and a fullUrl on every collection entry; required elements per batch 1 resource (US Core 6.1.0 is pinned in `packages/fhir/src/config.ts`, but the element lists were read from 7.0.0 to 9.0.0 pages, so differences against 6.1.0 are unverified); required-binding codes; cpl-3, us-core-2, us-core-17 (NPI check digit; read from the 9.0.0 Practitioner page, not verified for 6.1.0) and the pain scale range; reference resolution, allowed target types, `Reference.type` agreement and the organization boundary.
3. **Duplicates**: identifier system and value first, then a natural key (patient: family, given, birth date, gender; practitioner: family, given, staff id; goal: patient, description, start date; care plan: patient, title, published time, version number; observation: patient, code, effective time, value at two decimals).

`meta.profile` is never written.

## Round trip per resource

Record to FHIR, layers 1 and 2 on the resource alone, FHIR back to a record, and that record to FHIR again (`packages/fhir/test/roundtrip.test.ts` and `evaluation.test.ts`).

| Resource | Sample records | Pass layers 1 and 2 | Record equal after round trip | FHIR equal after second mapping |
|---|---|---|---|---|
| Organization | 1 | 1 | 1 | 1 |
| Practitioner | 2 | 2 | 2 | 2 |
| Patient | 1 | 1 | 1 | 1 |
| Goal | 2 | 2 | 2 | 2 |
| CarePlan (one per published version) | 2 | 2 | 2 | 2 |
| Observation (patient-reported, clinician, string value, dataAbsentReason, amended, entered in error) | 5 | 5 | 5 | 5 |

The sample export Bundle (13 entries) passes all three layers with 0 errors and 0 warnings. Every reference in it resolves to an entry, and referenced entries precede the entries that reference them.

Through the API (`apps/api/test/phase5/fhir.test.ts`), the export of a fixture patient with two plan versions, a goal and two check-ins has zero dangling references and passes all three layers. The route itself refuses to send a Bundle that fails them.

## Deliberately broken fixtures

31 fixtures in `packages/fhir/test/fixtures/broken/`. Each must fail, with its expected rule among the errors, an `expression` that starts with `Bundle`, and an OperationOutcome issue naming the rule. Columns count errors per layer for that fixture. Status applies to the two import fixtures.

| Fixture | Expected rule | Fails with it | Layer 1 errors | Layer 2 errors | Layer 3 errors | Import status |
|---|---|---|---|---|---|---|
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
| goal-missing-description | `uscore.goal.description` | yes | 1 | 1 | 0 | n/a |
| goal-status-not-a-code | `code.goal.lifecycleStatus` | yes | 0 | 1 | 0 | n/a |
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

Result: 31 of 31 fail with the expected rule. Layer 1 alone flags 7 of the 31.

What this shows about layer 1, from these fixtures only: Medplum caught missing required elements (`CarePlan.intent`, `Observation.status`, `Goal.description`), a malformed date, an unknown element, obs-6 and cpl-3. It did not flag codes outside a required binding (`Patient.gender = "banana"`, `Goal.lifecycleStatus = "paused"`, `Observation.status = "done"`), reference target types behind `urn:uuid:` references, or any US Core rule (no profiles are loaded). Those are caught by layer 2 only. The fixture set is small and was written by the same worker as the checks; it measures these cases, not general coverage.

## Synthea import

Generation: `pnpm synthea:demo`, recorded in `packages/fhir/fixtures/synthea/manifest.json`: Synthea `master-branch-latest` jar (sha256 `20098ec70c24c715ea874b19140983634711cc4986196105b5b0a9ca72a4b644`), OpenJDK 21.0.13, seed 20261120, clinician seed 20261120, reference date 2026-11-01, population 3, ages 40 to 70, Arizona, one year of history, US Core 6.1.0 export, and Claim, ExplanationOfBenefit, DiagnosticReport, DocumentReference, SupplyDelivery and ImagingStudy excluded to keep the fixtures small. Two runs produced byte-identical bundles, and the `pnpm synthea:demo` run on 2026-11-20 reported all four generated files identical to the committed fixtures. The committed files are the three patient bundles (transaction bundles) and the practitioner bundle (batch); the hospital bundle is not committed because import never creates organizations.

Import through `POST /fhir/import` (`app.inject`, seeded clinic admin, fresh database with the small seed), from the `pnpm synthea:demo` run:

| File | Entries | HTTP | Patient created | Practitioner created | CarePlan created / skipped | Observation created / skipped | Other types skipped |
|---|---|---|---|---|---|---|---|
| practitioners.json | 22 | 201 | 0 | 11 | 0 / 0 | 0 / 0 | 11 (PractitionerRole) |
| patient-1.json | 106 | 201 | 1 | 0 | 1 / 1 | 9 / 38 | 56 |
| patient-2.json | 94 | 201 | 1 | 0 | 1 / 1 | 10 / 12 | 69 |
| patient-3.json | 144 | 201 | 1 | 0 | 3 / 3 | 13 / 43 | 81 |
| Total | 366 | | 3 | 11 | 5 / 5 | 32 / 93 | 217 |

Re-importing patient-1.json afterwards answered 409 with 11 `dup.existing` issues (1 patient, 1 care plan, 9 observations) and wrote nothing. The same counts come out of the in-memory planner run in the gate.

Why records were skipped, from the itemised reports (patient-1, patient-2, patient-3):

| Reason (rule) | Count | Meaning |
|---|---|---|
| `import.skipped-type` | 56, 69, 81 | Resource type outside the allow-list (Encounter, Condition, Procedure, MedicationRequest, CareTeam, Device, Immunization, Provenance and others). Condition and Encounter belong to batch 2 |
| `map.observation.category.skipped` | 36, 10, 41 | Laboratory and social-history observations: CarePath stores survey, activity, exam and vital-signs only |
| `map.observation.value.skipped` | 2, 2, 2 | Panels with components and no value of their own (for example blood pressure) |
| `import.careplan.open-exists` | 1, 1, 3 | A second open plan for the same patient; CarePath keeps one open plan per patient |
| `map.careplan.activity.not-exercise` | 4, 6, 13 | SNOMED activities, not CarePath exercises: the plan is imported without them |
| `import.derived-practitioner` (information) | 49, 24, 62 | Synthea writes no `Observation.performer` or `CarePlan.author`; the practitioner of the referenced Encounter was used, found through Synthea's conditional reference `Practitioner?identifier=http://hl7.org/fhir/sid/us-npi|...` against the imported practitioners |

Without the practitioner bundle imported first, a patient bundle fails with 422 (`map.observation.performer`), because no performer can be derived (`packages/fhir/test/import.test.ts`).

## Import behaviour checked by tests

- Failure answers: 400 (not a Bundle, bdl-7, malformed date), 422 (pain out of range, wrong subject type, unresolved reference, NPI check digit), 409 (duplicates with `onDuplicate=reject`, the default). Each answers with an itemised OperationOutcome, writes nothing, and records an `import.fhir` event with outcome `minor_failure` and `detailCode` `rejected_<status>`.
- Success writes records and the `import.fhir` event in one transaction; ids are new; references are remapped.
- A relative reference to another organization's patient answers 422 with a body identical to the one for an id that does not exist.
- Export is allowed to therapists and admins (`fhir.export`) and to a patient for their own record (`fhir.export_own`); the coordinator gets 403, another organization 404 with `security.access_denied`. M8 enumerates the export route.

## Known limits

- Observation values are stored as Decimal(10, 2): a Synthea temperature of 37.967 is stored as 37.97. Natural keys compare at two decimals so a re-import still matches.
- Performer and author derived from the encounter practitioner are an import decision, reported per resource; they are not in the source data.
- Goal.addresses (Condition) and Observation.encounter are not exported until batch 2, so they cannot dangle. CarePlan versions carry the CarePath version number in a local extension (`urn:carepath:extension:care-plan-version-number`) and exercise doses in another (`urn:carepath:extension:exercise-dose`).
- Goal.achievementStatus is exported as text only; the goal-achievement code system was not verified.
- Planning reads before the write transaction starts; two imports of the same bundle at the same moment are not serialized, and a unique-key collision then answers 409 `already_exists`.
- Imported patients have no login and no care team; their status is `awaiting_assignment`.
