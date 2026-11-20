# CarePath domain model

Date: 2026-11-19 (WP 2.3, updated in WP 3.0 for migration `phase3_alignment`). Synthetic data only; not for clinical use. Source of truth: `packages/db/prisma/schema.prisma` and `packages/db/prisma/migrations/*`. Diagrams: `docs/architecture/erd.md`. Decisions applied: advisor plan ADR-3, ADR-8, ADR-9, ADR-10, advisor plan revision 1 (schema section) and `docs/research/healthcare-domain.md` sections 1 to 4.

## 1. Organization boundaries

- `Organization` is the tenant. Every tenant table carries `organizationId`. The exceptions are `User` (a global login), `Role` and `StatusTransition` (reference data). `AuditEvent.organizationId` and `Job.organizationId` are nullable for events and jobs with no tenant, such as a failed login for an unknown email.
- Each tenant parent has a unique key on `(id, organizationId)`. Children reference it with a composite foreign key `(parentId, organizationId)`, so a row in one organization cannot point at a parent in another. The database rejects it with SQLSTATE 23503; this is tested.
- A user acting inside a tenant row (booking, cancelling, reviewing, sending, signing, approving) is referenced through `OrganizationMembership(userId, organizationId)`, which proves the user belongs to that organization.
- A message sender is referenced through `ConversationParticipant(conversationId, userId)`: only participants can send.
- The database enforces the boundary for writes. Reads are scoped by the repositories in WP 2.4 (ADR-8). Postgres row-level security is stretch scope and not implemented.

## 2. Identity and roles

| Concept | Table | Notes |
|---|---|---|
| Login | `User` | Global, lowercase unique email, scrypt hash (WP 2.4). Never exported. |
| Role in a clinic | `OrganizationMembership` + `Role` | One membership per user per organization. Roles: `patient`, `physical_therapist`, `care_coordinator`, `clinic_admin`. `Role` rows are inserted by the constraints migration; permission keys are left empty for WP 2.4. |
| System actor | `AuditEvent.actorType` = `system` or `ai` | Jobs, automated rules and the AI pipeline are not users. |
| Anonymous caller | `AuditEvent.actorType` = `anonymous` | An unauthenticated request, such as a failed login for an unknown email (C1 ruling 3.1). A check constraint keeps `actorUserId` empty. |
| Eligibility code | `EnrollmentCode` | Demo eligibility code for onboarding (AC-A3). Only the SHA-256 hash of the normalised code is stored (`@carepath/shared/enrollment-code`). Redeemed once: `redeemedAt` and `redeemedByPatientId` are set together (check), and a patient redeems at most one code (unique). |
| Patient | `Patient` | `id` is an internal UUID. `mrn` is a business identifier, unique per organization, exported as `Patient.identifier`. Optional 1:1 link to a `User`. |
| Clinician | `Practitioner` | Only people who deliver care. Coordinators and admins have a membership but no Practitioner row, so they are never exported as clinical actors. `staffId` unique per organization; `npi` optional and must be 10 digits. |
| FHIR PractitionerRole | derived | Built from `Practitioner` + `OrganizationMembership` + `Role` at export time. Not stored. |
| FHIR Provenance | derived | Generated at export only (WP 5.4). Not stored. |

A user has at most one profile: a trigger rejects a `User` that is linked to both a `Patient` and a `Practitioner` (CP003).

## 3. Key relationships

- **Care team.** One `CareTeam` per patient. `CareTeamMember` rows point at memberships, so therapists and coordinators are both members. A partial unique index allows one active `primary_therapist` per team.
- **Intake.** `IntakeAssessment` stores autosaved answers (`currentStep`, `answers` JSON) and allows one `in_progress` assessment per patient.
- **Consent.** Exactly three types (`treatment_and_data_use`, `ai_assisted_features`, `motion_tracking`). One active consent per patient and type. The service layer refuses AI generation without an active `ai_assisted_features` consent (WP 5.2); the schema stores the evidence.
- **Condition.** Clinician-confirmed problems and diagnoses for FHIR Condition. FHIR invariants con-3, con-4 and con-5 are check constraints. Code system choice (ICD-10-CM or SNOMED CT) is an open item; codes are stored as system + code + display.
- **Care plans (ADR-10).** `CarePlan` is the mutable header. The builder autosaves into `CarePlan.draftContent`. Publishing inserts an immutable `CarePlanVersion` and its `ExerciseAssignment` rows, then moves `CarePlan.currentVersionId`, in one transaction. `currentVersionId` has a composite key `(currentVersionId, id)` into `CarePlanVersion(id, carePlanId)`, so a plan can only point at its own versions. Version numbers are gapless (trigger). From version 2, `changeNoteForPatient` is required (check constraint); the diff against the previous version is computed by the service. One open plan (`draft`, `active`, `on_hold`) per patient.
- **Sessions.** `ExerciseSession` runs against one `CarePlanVersion`, so history keeps the exact prescription it used. `SessionActivity` stores per-exercise progress for resume, skip (with `skipReason`, allowed only on skipped rows, AC-C3) and discomfort. "Stop, this hurts" ends a session as `stopped_discomfort` with `stoppedAt` set (AC-C4); it is terminal. One open (`in_progress` or `paused`) session per patient.
- **Clinic settings.** `Organization.phone` (shown in the pain notice, AC-D7; with no phone the notice says "contact your clinic") and `Organization.replyTimeText` (messaging, REQ-ADM-05). Both optional, never blank.
- **Check-ins and observations.** `PatientCheckIn` holds the patient report (pain 0 to 10). Pain is also written as an `Observation` with LOINC 72514-3; other measures use LOINC where verified and `urn:carepath:observation-code` otherwise. Observations carry exactly one of value or data-absent reason (FHIR obs-6).
- **Scheduling (ADR-9).** `AvailabilitySlot` rows cannot overlap per practitioner. `Appointment` rows cannot overlap per practitioner or per patient unless cancelled; both are exclusion constraints over `tstzrange(startsAt, endsAt, '[)')`, so back-to-back visits are allowed. One live appointment per slot. Rescheduling cancels the old row and inserts a new one with `rescheduledFromId`. `bookedTimezone` stores the IANA zone the patient booked in; times are UTC.
- **Encounters.** An `Encounter` exists only for a synchronous visit that took place (class `AMB` or `VR`). It has no planned or cancelled state, `startedAt` is required, and a trigger rejects linking it to an appointment that is `requested`, `booked`, cancelled or `no_show`. Asynchronous review is a `ReviewTask`.
- **Clinical notes.** `ClinicalNote` is the header, `ClinicalNoteVersion` holds SOAP content and is append-only. Status is `draft -> signed`; only the author can sign (check constraint), and signing needs a time and a current version. A signed note's header is frozen. New versions on a signed note must be amendments with a reason, written by a clinician, and the note can only move its current version to an amendment (triggers). A version that came from an AI draft has `source = ai_draft` and must reference its `AIGeneration`; it still needs the clinician's signature. Only signed notes are exported as DocumentReference.
- **Messaging.** `Conversation` belongs to a patient. Unread state is `ConversationParticipant.lastReadAt` against message times. `Message.status` is `queued`, `sent` or `failed` (with a reason).
- **Review queue.** `ReviewRule` holds configurable administrative rules per organization. `ReviewTask` has the rule, a plain-language `explanation`, `evidence` source references and a `dedupeKey`; one open task per rule, patient and key. Closing a task needs who and when.
- **AI.** `AIGeneration` stores `provider` and `providerLabel` for every output, prompt key and version, redacted input references, output, token and cost fields. `AIReview` is the append-only human decision (`approved`, `approved_with_edits` with the edited output, `rejected` with a reason).
- **Audit.** `AuditEvent` follows the research shape: actor, actor role and type, action code (C, R, U, D, E), event name, outcome, resource, patient, purpose of use, request id, hashed source IP. It is append-only by trigger. The hash chain is stretch scope (advisor plan revision 1) and not implemented.
- **Jobs (ADR-4).** `Job` is the Postgres queue: `queued -> running -> succeeded`, retry back to `queued`, `dead` after `maxAttempts`. A partial unique index deduplicates live jobs by `(queue, dedupeKey)`.
- **Sessions (ADR-7).** `AuthSession` stores a hash of the cookie token, tied to a membership.

## 4. Status transitions

Enforced on UPDATE by `enforce_status_transition()`, which looks up the `StatusTransition` table. The same rules are exported from `packages/db/src/status.ts` (`statusTransitions`, `canTransition`) for services and UI, and a test asserts the table and the TypeScript map are identical. INSERT may use any status, so seeds can write history directly. A change not listed is rejected with SQLSTATE `CP001`. Writing the same status again is always allowed.

| Table | Column | From | Allowed to |
|---|---|---|---|
| Patient | status | intake_incomplete | awaiting_assignment, inactive |
| Patient | status | awaiting_assignment | active, inactive |
| Patient | status | active | inactive, discharged |
| Patient | status | inactive | active, awaiting_assignment |
| Patient | status | discharged | active |
| OrganizationMembership | status | active | revoked |
| CareTeam | status | active | inactive |
| CareTeam | status | inactive | active |
| Consent | status | active | inactive, entered_in_error |
| Consent | status | inactive | entered_in_error |
| Consent | status | rejected | entered_in_error |
| IntakeAssessment | status | in_progress | submitted |
| IntakeAssessment | status | submitted | reviewed |
| Goal | lifecycleStatus | proposed | planned, accepted, active, cancelled, rejected, entered_in_error |
| Goal | lifecycleStatus | planned | accepted, active, cancelled, entered_in_error |
| Goal | lifecycleStatus | accepted | active, cancelled, entered_in_error |
| Goal | lifecycleStatus | active | on_hold, completed, cancelled, entered_in_error |
| Goal | lifecycleStatus | on_hold | active, completed, cancelled, entered_in_error |
| Goal | lifecycleStatus | completed | entered_in_error |
| Goal | lifecycleStatus | cancelled | entered_in_error |
| Goal | lifecycleStatus | rejected | entered_in_error |
| CarePlan | status | draft | active, revoked, entered_in_error |
| CarePlan | status | active | on_hold, completed, revoked, entered_in_error |
| CarePlan | status | on_hold | active, completed, revoked, entered_in_error |
| CarePlan | status | completed | entered_in_error |
| CarePlan | status | revoked | entered_in_error |
| ExerciseSession | status | in_progress | paused, completed, abandoned, stopped_discomfort |
| ExerciseSession | status | paused | in_progress, abandoned, stopped_discomfort |
| SessionActivity | status | pending | completed, skipped |
| SessionActivity | status | skipped | pending, completed |
| Observation | status | final | amended, corrected, entered_in_error |
| Observation | status | amended | corrected, entered_in_error |
| Observation | status | corrected | amended, entered_in_error |
| Observation | status | cancelled | entered_in_error |
| AvailabilitySlot | status | open | booked, blocked |
| AvailabilitySlot | status | booked | open |
| AvailabilitySlot | status | blocked | open |
| Appointment | status | requested | booked, cancelled_by_patient, cancelled_by_clinic |
| Appointment | status | booked | checked_in, in_progress, cancelled_by_patient, cancelled_by_clinic, no_show |
| Appointment | status | checked_in | in_progress, completed, cancelled_by_clinic, no_show |
| Appointment | status | in_progress | completed |
| Encounter | status | in_progress | finished, entered_in_error |
| Encounter | status | finished | entered_in_error |
| ClinicalNote | status | draft | signed, entered_in_error |
| ClinicalNote | status | signed | entered_in_error |
| Message | status | queued | sent, failed |
| Message | status | failed | queued |
| ReviewTask | status | open | in_review, resolved, dismissed |
| ReviewTask | status | in_review | open, resolved, dismissed |
| AIGeneration | status | pending | succeeded, failed |
| Job | status | queued | running |
| Job | status | running | succeeded, queued, dead |
| Job | status | dead | queued |

## 5. Append-only tables

`CarePlanVersion`, `ExerciseAssignment`, `ClinicalNoteVersion`, `AIReview` and `AuditEvent` reject UPDATE and DELETE with SQLSTATE `CP002`. `StatusTransition` rejects all writes after the migration. Deletes of parents use `ON DELETE RESTRICT`, so history cannot be removed by cascade.

UPDATE and DELETE are rejected by trigger; this guards against application bugs, not against a database administrator. `TRUNCATE` is not blocked, and the local application role is a superuser that can disable triggers (checkpoint C1, WP 2.3 defect 3; WP 8.2 records it in the threat model).

## 6. Constraints that live in raw SQL

In `packages/db/prisma/migrations/*_constraints/migration.sql` and the hand-written second half of `*_phase3_alignment/migration.sql`. Prisma's own migrations (`*_init`, first half of `*_phase3_alignment`) hold tables, enums, unique keys, indexes and foreign keys.

| Kind | Constraint |
|---|---|
| Extension | `btree_gist` (uuid equality inside GiST exclusion constraints) |
| Database | `timezone = UTC` for the database |
| Exclusion | `Appointment_practitioner_no_overlap`, `Appointment_patient_no_overlap` (status not cancelled), `AvailabilitySlot_practitioner_no_overlap` |
| Partial unique | `Appointment_slot_live_key`, `CarePlan_one_open_per_patient_key`, `IntakeAssessment_one_in_progress_per_patient_key`, `CareTeamMember_one_primary_therapist_key`, `CareTeamMember_active_member_key`, `Consent_one_active_per_type_key`, `ExerciseSession_one_open_per_patient_key`, `ReviewTask_one_open_per_trigger_key`, `Job_live_dedupe_key` |
| Check | Pain and discomfort 0 to 10; appointment and slot periods positive and at most 4 hours; cancellation fields only on cancelled appointments (FHIR app-4); Condition con-3/4/5; Observation obs-6 and pain NRS range; exercise dose and days of week; care plan published needs a version; version 2+ needs a patient note; note signer is the author; AI review edits and rejection reasons; AI generation success and failure fields; message length 1 to 4000; review task closure fields; job attempts; email lowercase; slug format; NPI 10 digits |
| Check (phase3_alignment) | anonymous audit actor has no user; skip reason only on skipped activities (1 to 500 characters); `stopped_discomfort` if and only if `stoppedAt`; enrollment code redeemed fields set together, hash is 64 hex characters; clinic phone and reply-time text not blank |
| Trigger | status transitions (CP001), append-only (CP002), single profile per user, gapless version numbers, note-version rules, frozen signed notes, encounter needs a visit that took place (CP003) |
| Trigger (phase3_alignment) | `enforce_same_parent` (CP003), one generic function: a session's plan version, a check-in's session, an observation's check-in and session, a goal's care plan and a note's encounter must belong to the row's patient, and a session activity's assignment must belong to the session's plan version. `reject_reparent` (CP003) fixes `patientId` on `CarePlan`, `ExerciseSession`, `PatientCheckIn`, `Encounter` and `carePlanVersionId` on `ExerciseSession` once written, so those checks cannot be undone from the parent side. Appointment and slot consistency is open (WP 4.1, C2) |

Error codes are exported from `packages/db/src/errors.ts` (`DbErrorCode`, `dbErrorInfo`, `isDbError`), which reads the SQLSTATE from both `pg` errors and Prisma driver-adapter errors. WP 4.1 maps `23P01` to HTTP 409.

## 7. Timestamps

Every instant is `timestamptz(3)` and the database time zone is UTC. Date-only values (`birthDate`, condition onset and abatement, goal start and due) are `date`. Every `updatedAt` has a database default so raw SQL and seeds can insert rows.

## 8. Tooling

- `pnpm --filter @carepath/db generate`: Prisma client into `src/generated/prisma` (git-ignored, also run on install).
- `pnpm db:migrate` (`migrate:deploy`), `migrate:reset`, `migrate:create <name>`, `migrate:check`: `packages/db/scripts/schema-engine.ts`, which runs Prisma's schema engine as WebAssembly (`@prisma/schema-engine-wasm`, pinned to the engine commit of `prisma@7.10.1`) because the Prisma CLI's native engine download from `binaries.prisma.sh` is blocked here. Migration files and the `_prisma_migrations` table are Prisma's standard format. `migrate:check` replays the migrations in a temporary shadow database and fails when `schema.prisma` and the migrations differ; it runs as part of `pnpm --filter db test`.
- The script patches three gaps in `@prisma/adapter-pg@7.10.1` for migration use only: the adapter splits scripts on every `;` (breaks PL/pgSQL), its shadow-database pool connects to the main database, and it cannot decode Postgres `"char"` columns the engine reads while describing a schema.
- New raw SQL goes in a new hand-written migration directory with a later timestamp. Avoid `;` inside `--` comments for portability with the stock adapter.
- `@carepath/db` exports types, enums, status rules and error helpers. `@carepath/db/client` exports `createPrismaClient()`; ESLint allows that import only in `repo.ts` files and `packages/db`.

## 9. Open items

- Permission keys on `Role` rows (WP 2.4).
- Condition code system after licensing review.
- Goal `achievementStatus` code set is unverified, stored as text.
- Postgres role with INSERT and SELECT only on `AuditEvent` (research suggestion). The trigger blocks UPDATE and DELETE for application code, but the local superuser role can disable it, and TRUNCATE is not blocked (WP 8.2).
- Appointment and slot consistency (same practitioner, time inside the slot) is not enforced by the database yet (WP 4.1, C2).
