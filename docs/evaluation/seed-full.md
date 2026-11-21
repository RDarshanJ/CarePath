# Full seed profile (WP 6.3)

Synthetic data only; not for clinical use. Every number below comes from a recorded run on 2026-11-20 in this repository (`pnpm db:seed --profile full` run twice in a fresh database `carepath_seedfull_<pid>`, with `--check` and the FHIR export check of all patients). They are measurements, not targets. The profile is `full` in `packages/db/seed/profiles.ts`; the demo `small` profile and its anchor are unchanged.

## Profile against the brief (docs/BRIEF.md section 18)

| Brief target | Full profile, measured rows | Note |
|---|---|---|
| 1,000 patients | 1,000 | Personas included |
| 30 clinicians | 30 | 5 clinics (Organizations) × 6 physical therapists |
| 5 clinics | 5 | |
| 3 administrative roles | not changed by WP 6.3 | Not re-counted in this work package |
| 50 exercise-library entries | 250 rows | The library holds 50 entries; each clinic holds its own copy (tenant boundary), so 5 × 50 = 250 |
| 2,000 appointment records | 2,000 | |
| 10,000 activity records | 10,000 | `SessionActivity` rows |
| 50 clinical encounters | 51 | The profile sets 50; the small profile shows the same one-row offset (8 set, 9 rows) |
| 90 days of history | 90 days before the anchor | `historyDays: 90`; 21 days of availability after it |
| Edge cases | see the table below | |

No profile values were changed. The `full` profile already met these targets before WP 6.3; WP 6.3 added the verification and the record.

## Row counts (run A)

Total rows: 70,779 across 35 tables. Content hash (SHA-256 over per-table checksums): `eb3c2ae0fe9245a86d70fbf19357cd42d6717738c3e43742a3400986e4366c54`.

| Table | Rows | Table | Rows |
|---|---:|---|---:|
| Organization | 5 | ExerciseSession | 2,428 |
| User | 988 | SessionActivity | 10,000 |
| OrganizationMembership | 988 | PatientCheckIn | 3,382 |
| Patient | 1,000 | AvailabilitySlot | 19,200 |
| Practitioner | 30 | Appointment | 2,000 |
| CareTeam | 839 | Encounter | 51 |
| CareTeamMember | 1,678 | Observation | 3,482 |
| Consent | 1,792 | AIGeneration | 37 |
| IntakeAssessment | 1,000 | ClinicalNote | 50 |
| EnrollmentCode | 25 | ClinicalNoteVersion | 74 |
| Condition | 773 | AIReview | 23 |
| Exercise | 250 | Conversation | 823 |
| CarePlan | 839 | ConversationParticipant | 2,433 |
| CarePlanVersion | 1,521 | Message | 1,846 |
| ExerciseAssignment | 6,235 | Notification | 1,718 |
| Goal | 936 | ReviewRule | 25 |
| ReviewTask | 828 | ReviewTaskEvent | 91 |
| AuditEvent | 3,357 | Job | 32 |

Full list with per-table checksums: the output of `pnpm db:seed --profile full`, reproduced by `scripts/gate-wp-6.3.sh`.

## Edge cases in the seeded database (run A)

| Area | Status | Rows |
|---|---|---:|
| Patient | active / inactive / discharged | 600 / 139 / 100 |
| Patient | intake_incomplete / awaiting_assignment | 81 / 80 |
| Appointment | booked / completed | 402 / 1,384 |
| Appointment | cancelled_by_patient / cancelled_by_clinic / no_show | 113 / 63 / 38 |
| Intake | in_progress / submitted / reviewed | 81 / 80 / 839 |
| ExerciseSession | completed / paused / abandoned / stopped_discomfort | 2,222 / 32 / 75 / 99 |
| SessionActivity | completed / skipped / pending | 8,783 / 712 / 505 |
| ClinicalNote | signed / draft | 33 / 17 |
| AIGeneration | succeeded / failed | 36 / 1 |
| Job | succeeded / queued / dead | 20 / 11 / 1 |
| Message | sent / failed | 1,827 / 19 |
| ReviewTask | open / in_review / resolved / dismissed | 783 / 15 / 20 / 10 |
| AvailabilitySlot | open / booked / blocked | 16,540 / 1,824 / 836 |

These counts come from `SELECT status, count(*)` on the seeded database. The 80 integrity checks cover the same edge cases as assertions (for example, a dead job, sparse patients without contact details, rescheduled appointments, skipped activities with a reason, a dead job, stopped sessions that record their discomfort).

## Timing

| Step | Wall time (s) | Notes |
|---|---:|---|
| Full seed, run A (`db:seed --profile full`) | 6.93 | Generation 786 ms, write and checks 5,214 ms (reported by the seed) |
| Full seed, run B (same seed) | 6.60 | Same content hash as run A |
| `db:seed --profile full --check` | 2.42 | 80 of 80 integrity checks |
| FHIR export of all 1,000 patients, three layers | 9.64 | `apps/api/scripts/fhir-export-check.ts` |

Wall time includes Node and tsx start-up and the database connection. The machine is the build environment; numbers will differ on other hardware.

## Determinism

Two full seeds with the same seed string (`carepath-seed-1`) and anchor (`2026-11-19T16:00:00.000Z`) produced the same content hash. The small profile's hash is recorded in `docs/PROGRESS.md` (WP 6.3 entry).

## FHIR export of the full seed

All 1,000 patient exports pass the three layers (structural, CarePath checks, duplicates) with zero failing bundles. Bundle entry counts across the 1,000 exports: Patient 1,000, Organization 1,000, Practitioner 1,052, CarePlan 1,521, Goal 936, Observation 3,482, Condition 773, Appointment 2,000, Encounter 51, DocumentReference 46. No draft note version id appears in any export. The seeded NPIs (30 clinicians) all pass `isValidNpi`. 17 notes are unsigned in the database and none of their version ids leak.

This is the CarePath validation only. The official HL7 validator was not run; see `docs/evaluation/fhir-validation.md`. Nothing here is a claim of US Core conformance.

## Deviations

- Exercise library: 50 entries per clinic, 250 rows in total. The brief's 50 is read as the library size, not a row count across all clinics.
- Encounters: 51 rows against the profile's 50.
- Administrative roles were not re-counted.
