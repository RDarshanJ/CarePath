-- CarePath raw-SQL constraints: everything the Prisma schema language cannot express.
-- Hand-written. Keep in sync with prisma/schema.prisma, src/status.ts and
-- docs/architecture/domain-model.md. Custom SQLSTATEs (exported from src/errors.ts):
--   CP001 illegal status transition   CP002 append-only table   CP003 domain rule
-- Standard SQLSTATEs used: 23P01 exclusion, 23514 check, 23505 unique, 23503 foreign key.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Store and compare everything in UTC regardless of client settings.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
END
$$;

-- ---------------------------------------------------------------------------
-- 1. Reference data
-- ---------------------------------------------------------------------------

-- Role rows are fixed by the RoleKey enum. Permission keys are filled in by WP 2.4.
INSERT INTO "Role" ("key", "name", "description", "permissions") VALUES
  ('patient', 'Patient', 'Receives care; sees own plan, sessions, appointments and messages.', '{}'),
  ('physical_therapist', 'Physical therapist', 'Reads any patient in the organization; writes for care-team patients.', '{}'),
  ('care_coordinator', 'Care coordinator', 'Enrollment, assignment, scheduling and messaging for the caseload.', '{}'),
  ('clinic_admin', 'Clinic administrator', 'Organization settings, memberships, availability, metrics and audit.', '{}');

INSERT INTO "StatusTransition" ("tableName", "column", "fromStatus", "toStatus") VALUES
  ('Patient', 'status', 'intake_incomplete', 'awaiting_assignment'),
  ('Patient', 'status', 'intake_incomplete', 'inactive'),
  ('Patient', 'status', 'awaiting_assignment', 'active'),
  ('Patient', 'status', 'awaiting_assignment', 'inactive'),
  ('Patient', 'status', 'active', 'inactive'),
  ('Patient', 'status', 'active', 'discharged'),
  ('Patient', 'status', 'inactive', 'active'),
  ('Patient', 'status', 'inactive', 'awaiting_assignment'),
  ('Patient', 'status', 'discharged', 'active'),
  ('OrganizationMembership', 'status', 'active', 'revoked'),
  ('CareTeam', 'status', 'active', 'inactive'),
  ('CareTeam', 'status', 'inactive', 'active'),
  ('Consent', 'status', 'active', 'inactive'),
  ('Consent', 'status', 'active', 'entered_in_error'),
  ('Consent', 'status', 'inactive', 'entered_in_error'),
  ('Consent', 'status', 'rejected', 'entered_in_error'),
  ('IntakeAssessment', 'status', 'in_progress', 'submitted'),
  ('IntakeAssessment', 'status', 'submitted', 'reviewed'),
  ('Goal', 'lifecycleStatus', 'proposed', 'planned'),
  ('Goal', 'lifecycleStatus', 'proposed', 'accepted'),
  ('Goal', 'lifecycleStatus', 'proposed', 'active'),
  ('Goal', 'lifecycleStatus', 'proposed', 'cancelled'),
  ('Goal', 'lifecycleStatus', 'proposed', 'rejected'),
  ('Goal', 'lifecycleStatus', 'proposed', 'entered_in_error'),
  ('Goal', 'lifecycleStatus', 'planned', 'accepted'),
  ('Goal', 'lifecycleStatus', 'planned', 'active'),
  ('Goal', 'lifecycleStatus', 'planned', 'cancelled'),
  ('Goal', 'lifecycleStatus', 'planned', 'entered_in_error'),
  ('Goal', 'lifecycleStatus', 'accepted', 'active'),
  ('Goal', 'lifecycleStatus', 'accepted', 'cancelled'),
  ('Goal', 'lifecycleStatus', 'accepted', 'entered_in_error'),
  ('Goal', 'lifecycleStatus', 'active', 'on_hold'),
  ('Goal', 'lifecycleStatus', 'active', 'completed'),
  ('Goal', 'lifecycleStatus', 'active', 'cancelled'),
  ('Goal', 'lifecycleStatus', 'active', 'entered_in_error'),
  ('Goal', 'lifecycleStatus', 'on_hold', 'active'),
  ('Goal', 'lifecycleStatus', 'on_hold', 'completed'),
  ('Goal', 'lifecycleStatus', 'on_hold', 'cancelled'),
  ('Goal', 'lifecycleStatus', 'on_hold', 'entered_in_error'),
  ('Goal', 'lifecycleStatus', 'completed', 'entered_in_error'),
  ('Goal', 'lifecycleStatus', 'cancelled', 'entered_in_error'),
  ('Goal', 'lifecycleStatus', 'rejected', 'entered_in_error'),
  ('CarePlan', 'status', 'draft', 'active'),
  ('CarePlan', 'status', 'draft', 'revoked'),
  ('CarePlan', 'status', 'draft', 'entered_in_error'),
  ('CarePlan', 'status', 'active', 'on_hold'),
  ('CarePlan', 'status', 'active', 'completed'),
  ('CarePlan', 'status', 'active', 'revoked'),
  ('CarePlan', 'status', 'active', 'entered_in_error'),
  ('CarePlan', 'status', 'on_hold', 'active'),
  ('CarePlan', 'status', 'on_hold', 'completed'),
  ('CarePlan', 'status', 'on_hold', 'revoked'),
  ('CarePlan', 'status', 'on_hold', 'entered_in_error'),
  ('CarePlan', 'status', 'completed', 'entered_in_error'),
  ('CarePlan', 'status', 'revoked', 'entered_in_error'),
  ('ExerciseSession', 'status', 'in_progress', 'paused'),
  ('ExerciseSession', 'status', 'in_progress', 'completed'),
  ('ExerciseSession', 'status', 'in_progress', 'abandoned'),
  ('ExerciseSession', 'status', 'paused', 'in_progress'),
  ('ExerciseSession', 'status', 'paused', 'abandoned'),
  ('SessionActivity', 'status', 'pending', 'completed'),
  ('SessionActivity', 'status', 'pending', 'skipped'),
  ('SessionActivity', 'status', 'skipped', 'pending'),
  ('SessionActivity', 'status', 'skipped', 'completed'),
  ('Observation', 'status', 'final', 'amended'),
  ('Observation', 'status', 'final', 'corrected'),
  ('Observation', 'status', 'final', 'entered_in_error'),
  ('Observation', 'status', 'amended', 'corrected'),
  ('Observation', 'status', 'amended', 'entered_in_error'),
  ('Observation', 'status', 'corrected', 'amended'),
  ('Observation', 'status', 'corrected', 'entered_in_error'),
  ('Observation', 'status', 'cancelled', 'entered_in_error'),
  ('AvailabilitySlot', 'status', 'open', 'booked'),
  ('AvailabilitySlot', 'status', 'open', 'blocked'),
  ('AvailabilitySlot', 'status', 'booked', 'open'),
  ('AvailabilitySlot', 'status', 'blocked', 'open'),
  ('Appointment', 'status', 'requested', 'booked'),
  ('Appointment', 'status', 'requested', 'cancelled_by_patient'),
  ('Appointment', 'status', 'requested', 'cancelled_by_clinic'),
  ('Appointment', 'status', 'booked', 'checked_in'),
  ('Appointment', 'status', 'booked', 'in_progress'),
  ('Appointment', 'status', 'booked', 'cancelled_by_patient'),
  ('Appointment', 'status', 'booked', 'cancelled_by_clinic'),
  ('Appointment', 'status', 'booked', 'no_show'),
  ('Appointment', 'status', 'checked_in', 'in_progress'),
  ('Appointment', 'status', 'checked_in', 'completed'),
  ('Appointment', 'status', 'checked_in', 'cancelled_by_clinic'),
  ('Appointment', 'status', 'checked_in', 'no_show'),
  ('Appointment', 'status', 'in_progress', 'completed'),
  ('Encounter', 'status', 'in_progress', 'finished'),
  ('Encounter', 'status', 'in_progress', 'entered_in_error'),
  ('Encounter', 'status', 'finished', 'entered_in_error'),
  ('ClinicalNote', 'status', 'draft', 'signed'),
  ('ClinicalNote', 'status', 'draft', 'entered_in_error'),
  ('ClinicalNote', 'status', 'signed', 'entered_in_error'),
  ('Message', 'status', 'queued', 'sent'),
  ('Message', 'status', 'queued', 'failed'),
  ('Message', 'status', 'failed', 'queued'),
  ('ReviewTask', 'status', 'open', 'in_review'),
  ('ReviewTask', 'status', 'open', 'resolved'),
  ('ReviewTask', 'status', 'open', 'dismissed'),
  ('ReviewTask', 'status', 'in_review', 'open'),
  ('ReviewTask', 'status', 'in_review', 'resolved'),
  ('ReviewTask', 'status', 'in_review', 'dismissed'),
  ('AIGeneration', 'status', 'pending', 'succeeded'),
  ('AIGeneration', 'status', 'pending', 'failed'),
  ('Job', 'status', 'queued', 'running'),
  ('Job', 'status', 'running', 'succeeded'),
  ('Job', 'status', 'running', 'queued'),
  ('Job', 'status', 'running', 'dead'),
  ('Job', 'status', 'dead', 'queued');

-- ---------------------------------------------------------------------------
-- 2. Status transitions (UPDATE only, INSERT may use any status)
-- ---------------------------------------------------------------------------

CREATE FUNCTION enforce_status_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  col text := TG_ARGV[0];
  old_status text := to_jsonb(OLD) ->> col;
  new_status text := to_jsonb(NEW) ->> col;
BEGIN
  IF old_status IS DISTINCT FROM new_status AND NOT EXISTS (
    SELECT 1 FROM "StatusTransition" t
    WHERE t."tableName" = TG_TABLE_NAME AND t."column" = col
      AND t."fromStatus" = old_status AND t."toStatus" = new_status
  ) THEN
    RAISE EXCEPTION 'illegal % transition on %: % -> %', col, TG_TABLE_NAME, old_status, new_status
      USING ERRCODE = 'CP001', TABLE = TG_TABLE_NAME, COLUMN = col;
  END IF;
  RETURN NEW;
END
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT "tableName", "column" FROM "StatusTransition" LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OF %I ON %I FOR EACH ROW EXECUTE FUNCTION enforce_status_transition(%L)',
      r."tableName" || '_status_transition', r."column", r."tableName", r."column");
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Append-only tables
-- ---------------------------------------------------------------------------

CREATE FUNCTION reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % rejected', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'CP002', TABLE = TG_TABLE_NAME;
END
$$;

CREATE TRIGGER "CarePlanVersion_append_only" BEFORE UPDATE OR DELETE ON "CarePlanVersion"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER "ExerciseAssignment_append_only" BEFORE UPDATE OR DELETE ON "ExerciseAssignment"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER "ClinicalNoteVersion_append_only" BEFORE UPDATE OR DELETE ON "ClinicalNoteVersion"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER "AIReview_append_only" BEFORE UPDATE OR DELETE ON "AIReview"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER "AuditEvent_append_only" BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();
CREATE TRIGGER "StatusTransition_read_only" BEFORE INSERT OR UPDATE OR DELETE ON "StatusTransition"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

-- ---------------------------------------------------------------------------
-- 4. Booking integrity (ADR-9): no overlaps per practitioner or per patient
-- ---------------------------------------------------------------------------

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_practitioner_no_overlap"
  EXCLUDE USING gist ("practitionerId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE (status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic'));

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_no_overlap"
  EXCLUDE USING gist ("patientId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE (status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic'));

ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_practitioner_no_overlap"
  EXCLUDE USING gist ("practitionerId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&);

-- One live appointment per slot.
CREATE UNIQUE INDEX "Appointment_slot_live_key" ON "Appointment" ("slotId")
  WHERE "slotId" IS NOT NULL AND status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic');

-- ---------------------------------------------------------------------------
-- 5. Partial unique indexes
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX "CarePlan_one_open_per_patient_key" ON "CarePlan" ("patientId")
  WHERE status IN ('draft', 'active', 'on_hold');
CREATE UNIQUE INDEX "IntakeAssessment_one_in_progress_per_patient_key" ON "IntakeAssessment" ("patientId")
  WHERE status = 'in_progress';
CREATE UNIQUE INDEX "CareTeamMember_one_primary_therapist_key" ON "CareTeamMember" ("careTeamId")
  WHERE role = 'primary_therapist' AND "endedAt" IS NULL;
CREATE UNIQUE INDEX "CareTeamMember_active_member_key" ON "CareTeamMember" ("careTeamId", "userId")
  WHERE "endedAt" IS NULL;
CREATE UNIQUE INDEX "Consent_one_active_per_type_key" ON "Consent" ("patientId", type)
  WHERE status = 'active';
CREATE UNIQUE INDEX "ExerciseSession_one_open_per_patient_key" ON "ExerciseSession" ("patientId")
  WHERE status IN ('in_progress', 'paused');
CREATE UNIQUE INDEX "ReviewTask_one_open_per_trigger_key" ON "ReviewTask" ("ruleId", "patientId", "dedupeKey")
  WHERE status IN ('open', 'in_review');
CREATE UNIQUE INDEX "Job_live_dedupe_key" ON "Job" (queue, "dedupeKey")
  WHERE "dedupeKey" IS NOT NULL AND status IN ('queued', 'running');

-- ---------------------------------------------------------------------------
-- 6. Check constraints
-- ---------------------------------------------------------------------------

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_slug_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE "User"
  ADD CONSTRAINT "User_email_check" CHECK (email = lower(email) AND position('@' IN email) > 1);

ALTER TABLE "OrganizationMembership"
  ADD CONSTRAINT "OrganizationMembership_revoked_check" CHECK (status <> 'revoked' OR "endedAt" IS NOT NULL);

ALTER TABLE "AuthSession"
  ADD CONSTRAINT "AuthSession_expiry_check" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "Patient"
  ADD CONSTRAINT "Patient_mrn_check" CHECK (btrim(mrn) <> ''),
  ADD CONSTRAINT "Patient_birth_date_check" CHECK ("birthDate" >= DATE '1900-01-01');

ALTER TABLE "Practitioner"
  ADD CONSTRAINT "Practitioner_npi_check" CHECK (npi IS NULL OR npi ~ '^[0-9]{10}$');

ALTER TABLE "CareTeamMember"
  ADD CONSTRAINT "CareTeamMember_period_check" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");

ALTER TABLE "Consent"
  ADD CONSTRAINT "Consent_revoked_check" CHECK (status <> 'inactive' OR "revokedAt" IS NOT NULL),
  ADD CONSTRAINT "Consent_period_check" CHECK ("revokedAt" IS NULL OR "revokedAt" >= "grantedAt");

ALTER TABLE "IntakeAssessment"
  ADD CONSTRAINT "IntakeAssessment_pain_check" CHECK ("painScore" IS NULL OR "painScore" BETWEEN 0 AND 10),
  ADD CONSTRAINT "IntakeAssessment_submitted_check" CHECK (status = 'in_progress' OR "submittedAt" IS NOT NULL),
  ADD CONSTRAINT "IntakeAssessment_reviewed_check" CHECK (status <> 'reviewed' OR "reviewedAt" IS NOT NULL);

-- FHIR con-3, con-4, con-5.
ALTER TABLE "Condition"
  ADD CONSTRAINT "Condition_con3_check" CHECK (category <> 'problem_list_item' OR "verificationStatus" = 'entered_in_error' OR "clinicalStatus" IS NOT NULL),
  ADD CONSTRAINT "Condition_con4_check" CHECK ("abatementDate" IS NULL OR "clinicalStatus" IN ('inactive', 'resolved', 'remission')),
  ADD CONSTRAINT "Condition_con5_check" CHECK ("verificationStatus" <> 'entered_in_error' OR "clinicalStatus" IS NULL),
  ADD CONSTRAINT "Condition_dates_check" CHECK ("abatementDate" IS NULL OR "onsetDate" IS NULL OR "abatementDate" >= "onsetDate");

ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_dates_check" CHECK ("dueDate" IS NULL OR "startDate" IS NULL OR "dueDate" >= "startDate");

ALTER TABLE "Exercise"
  ADD CONSTRAINT "Exercise_defaults_check" CHECK (
    coalesce("defaultSets", 1) >= 1 AND coalesce("defaultReps", 1) >= 1
    AND coalesce("defaultHoldSeconds", 1) >= 1 AND coalesce("defaultDurationSeconds", 1) >= 1);

ALTER TABLE "CarePlan"
  ADD CONSTRAINT "CarePlan_published_check" CHECK (status IN ('draft', 'revoked', 'entered_in_error') OR "currentVersionId" IS NOT NULL);

-- Advisor plan rev1: a revision needs a patient-facing note from version 2 onward.
ALTER TABLE "CarePlanVersion"
  ADD CONSTRAINT "CarePlanVersion_number_check" CHECK ("versionNumber" >= 1),
  ADD CONSTRAINT "CarePlanVersion_patient_note_check" CHECK ("versionNumber" = 1 OR btrim(coalesce("changeNoteForPatient", '')) <> '');

ALTER TABLE "ExerciseAssignment"
  ADD CONSTRAINT "ExerciseAssignment_position_check" CHECK (position >= 0),
  ADD CONSTRAINT "ExerciseAssignment_dose_check" CHECK (
    coalesce(sets, 1) >= 1 AND coalesce(reps, 1) >= 1
    AND coalesce("holdSeconds", 1) >= 1 AND coalesce("durationSeconds", 1) >= 1
    AND (reps IS NOT NULL OR "durationSeconds" IS NOT NULL OR "holdSeconds" IS NOT NULL)),
  ADD CONSTRAINT "ExerciseAssignment_rest_check" CHECK ("restSeconds" BETWEEN 0 AND 600),
  ADD CONSTRAINT "ExerciseAssignment_days_check" CHECK (
    cardinality("daysOfWeek") BETWEEN 1 AND 7 AND "daysOfWeek" <@ ARRAY[0, 1, 2, 3, 4, 5, 6]),
  ADD CONSTRAINT "ExerciseAssignment_times_check" CHECK ("timesPerDay" BETWEEN 1 AND 6);

ALTER TABLE "ExerciseSession"
  ADD CONSTRAINT "ExerciseSession_progress_check" CHECK ("currentPosition" >= 0 AND "elapsedSeconds" >= 0),
  ADD CONSTRAINT "ExerciseSession_completed_check" CHECK (status <> 'completed' OR "completedAt" IS NOT NULL),
  ADD CONSTRAINT "ExerciseSession_paused_check" CHECK (status <> 'paused' OR "pausedAt" IS NOT NULL);

ALTER TABLE "SessionActivity"
  ADD CONSTRAINT "SessionActivity_counts_check" CHECK (
    coalesce("completedSets", 0) >= 0 AND coalesce("completedReps", 0) >= 0 AND coalesce("durationSeconds", 0) >= 0),
  ADD CONSTRAINT "SessionActivity_discomfort_check" CHECK (
    ("discomfortLevel" IS NULL OR "discomfortLevel" BETWEEN 0 AND 10)
    AND (NOT "discomfortReported" OR "discomfortLevel" IS NOT NULL)),
  ADD CONSTRAINT "SessionActivity_completed_check" CHECK (status <> 'completed' OR "completedAt" IS NOT NULL);

ALTER TABLE "PatientCheckIn"
  ADD CONSTRAINT "PatientCheckIn_pain_check" CHECK ("painScore" BETWEEN 0 AND 10),
  ADD CONSTRAINT "PatientCheckIn_review_check" CHECK (("reviewedAt" IS NULL) = ("reviewedByUserId" IS NULL));

-- FHIR obs-6: a value or a dataAbsentReason, never both. Pain NRS (LOINC 72514-3) is 0..10.
ALTER TABLE "Observation"
  ADD CONSTRAINT "Observation_value_check" CHECK (num_nonnulls("valueQuantity", "valueString", "dataAbsentReason") = 1),
  ADD CONSTRAINT "Observation_unit_check" CHECK ("valueUnit" IS NULL OR "valueQuantity" IS NOT NULL),
  ADD CONSTRAINT "Observation_pain_nrs_check" CHECK (
    NOT ("codeSystem" = 'http://loinc.org' AND code = '72514-3')
    OR "dataAbsentReason" IS NOT NULL OR "valueQuantity" BETWEEN 0 AND 10),
  ADD CONSTRAINT "Observation_performer_check" CHECK (("performerType" = 'practitioner') = ("performerPractitionerId" IS NOT NULL));

ALTER TABLE "AvailabilitySlot"
  ADD CONSTRAINT "AvailabilitySlot_period_check" CHECK ("endsAt" > "startsAt" AND "endsAt" - "startsAt" <= interval '4 hours');

-- FHIR app-4: a cancellation reason only on cancelled or no-show appointments.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_period_check" CHECK ("endsAt" > "startsAt" AND "endsAt" - "startsAt" <= interval '4 hours'),
  ADD CONSTRAINT "Appointment_timezone_check" CHECK (btrim("bookedTimezone") <> ''),
  ADD CONSTRAINT "Appointment_cancelled_check" CHECK (
    (status IN ('cancelled_by_patient', 'cancelled_by_clinic')) = ("cancelledAt" IS NOT NULL)),
  ADD CONSTRAINT "Appointment_cancellation_reason_check" CHECK (
    "cancellationReason" IS NULL OR status IN ('cancelled_by_patient', 'cancelled_by_clinic', 'no_show')),
  ADD CONSTRAINT "Appointment_not_self_reschedule_check" CHECK ("rescheduledFromId" IS NULL OR "rescheduledFromId" <> id);

ALTER TABLE "Encounter"
  ADD CONSTRAINT "Encounter_period_check" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt"),
  ADD CONSTRAINT "Encounter_finished_check" CHECK (status <> 'finished' OR "endedAt" IS NOT NULL);

-- Signing is a human act by the author: signed requires signer = author, a time and content.
ALTER TABLE "ClinicalNote"
  ADD CONSTRAINT "ClinicalNote_signed_check" CHECK (
    status <> 'signed' OR ("signedAt" IS NOT NULL AND "signedByPractitionerId" IS NOT NULL AND "currentVersionId" IS NOT NULL)),
  ADD CONSTRAINT "ClinicalNote_signer_is_author_check" CHECK (
    "signedByPractitionerId" IS NULL OR "signedByPractitionerId" = "authorPractitionerId"),
  ADD CONSTRAINT "ClinicalNote_draft_unsigned_check" CHECK (status <> 'draft' OR "signedAt" IS NULL);

ALTER TABLE "ClinicalNoteVersion"
  ADD CONSTRAINT "ClinicalNoteVersion_number_check" CHECK ("versionNumber" >= 1),
  ADD CONSTRAINT "ClinicalNoteVersion_ai_source_check" CHECK (source <> 'ai_draft' OR "aiGenerationId" IS NOT NULL),
  ADD CONSTRAINT "ClinicalNoteVersion_amendment_check" CHECK (
    NOT "isAmendment" OR (btrim(coalesce("amendmentReason", '')) <> '' AND source = 'clinician'));

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_body_check" CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  ADD CONSTRAINT "Message_failed_check" CHECK (status <> 'failed' OR "failureReason" IS NOT NULL),
  ADD CONSTRAINT "Message_sent_check" CHECK (status <> 'sent' OR "sentAt" IS NOT NULL);

ALTER TABLE "ReviewRule"
  ADD CONSTRAINT "ReviewRule_priority_check" CHECK (priority BETWEEN 0 AND 100);

ALTER TABLE "ReviewTask"
  ADD CONSTRAINT "ReviewTask_priority_check" CHECK (priority BETWEEN 0 AND 100),
  ADD CONSTRAINT "ReviewTask_explanation_check" CHECK (btrim(explanation) <> ''),
  ADD CONSTRAINT "ReviewTask_closed_check" CHECK (
    status IN ('open', 'in_review') OR ("resolvedAt" IS NOT NULL AND "resolvedByUserId" IS NOT NULL));

ALTER TABLE "AIGeneration"
  ADD CONSTRAINT "AIGeneration_label_check" CHECK (btrim(provider) <> '' AND btrim("providerLabel") <> ''),
  ADD CONSTRAINT "AIGeneration_succeeded_check" CHECK (status <> 'succeeded' OR (output IS NOT NULL AND "completedAt" IS NOT NULL)),
  ADD CONSTRAINT "AIGeneration_failed_check" CHECK (status <> 'failed' OR (error IS NOT NULL AND "completedAt" IS NOT NULL)),
  ADD CONSTRAINT "AIGeneration_counters_check" CHECK (
    coalesce("inputTokens", 0) >= 0 AND coalesce("outputTokens", 0) >= 0 AND coalesce("costMicroUsd", 0) >= 0
    AND coalesce("latencyMs", 0) >= 0 AND coalesce("unsupportedStatementCount", 0) >= 0);

ALTER TABLE "AIReview"
  ADD CONSTRAINT "AIReview_edits_check" CHECK (decision <> 'approved_with_edits' OR "editedOutput" IS NOT NULL),
  ADD CONSTRAINT "AIReview_reject_reason_check" CHECK (decision <> 'rejected' OR btrim(coalesce(reason, '')) <> '');

-- A patient reference needs the organization so the composite FK is actually checked.
ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_patient_org_check" CHECK ("patientId" IS NULL OR "organizationId" IS NOT NULL),
  ADD CONSTRAINT "AuditEvent_user_actor_check" CHECK ("actorType" <> 'user' OR "actorUserId" IS NOT NULL);

ALTER TABLE "Job"
  ADD CONSTRAINT "Job_attempts_check" CHECK ("maxAttempts" >= 1 AND attempts BETWEEN 0 AND "maxAttempts"),
  ADD CONSTRAINT "Job_running_check" CHECK (status <> 'running' OR "lockedAt" IS NOT NULL),
  ADD CONSTRAINT "Job_succeeded_check" CHECK (status <> 'succeeded' OR "completedAt" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 7. Domain-rule triggers (CP003)
-- ---------------------------------------------------------------------------

-- A user is a patient or a practitioner, never both.
CREATE FUNCTION enforce_single_profile() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."userId" IS NOT NULL AND (
    (TG_TABLE_NAME = 'Patient' AND EXISTS (SELECT 1 FROM "Practitioner" WHERE "userId" = NEW."userId"))
    OR (TG_TABLE_NAME = 'Practitioner' AND EXISTS (SELECT 1 FROM "Patient" WHERE "userId" = NEW."userId"))
  ) THEN
    RAISE EXCEPTION 'user % already has a % profile', NEW."userId",
      CASE TG_TABLE_NAME WHEN 'Patient' THEN 'practitioner' ELSE 'patient' END
      USING ERRCODE = 'CP003', TABLE = TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER "Patient_single_profile" BEFORE INSERT OR UPDATE OF "userId" ON "Patient"
  FOR EACH ROW EXECUTE FUNCTION enforce_single_profile();
CREATE TRIGGER "Practitioner_single_profile" BEFORE INSERT OR UPDATE OF "userId" ON "Practitioner"
  FOR EACH ROW EXECUTE FUNCTION enforce_single_profile();

-- Version numbers are gapless per parent: next = max + 1. Concurrent publishes that compute
-- the same number collide on the (parent, versionNumber) unique index.
CREATE FUNCTION enforce_next_version_number() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  expected int;
BEGIN
  IF TG_TABLE_NAME = 'CarePlanVersion' THEN
    SELECT coalesce(max("versionNumber"), 0) + 1 INTO expected
      FROM "CarePlanVersion" WHERE "carePlanId" = NEW."carePlanId";
  ELSE
    SELECT coalesce(max("versionNumber"), 0) + 1 INTO expected
      FROM "ClinicalNoteVersion" WHERE "noteId" = NEW."noteId";
  END IF;
  IF NEW."versionNumber" <> expected THEN
    RAISE EXCEPTION '% versionNumber must be %, got %', TG_TABLE_NAME, expected, NEW."versionNumber"
      USING ERRCODE = 'CP003', TABLE = TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER "CarePlanVersion_next_number" BEFORE INSERT ON "CarePlanVersion"
  FOR EACH ROW EXECUTE FUNCTION enforce_next_version_number();
CREATE TRIGGER "ClinicalNoteVersion_next_number" BEFORE INSERT ON "ClinicalNoteVersion"
  FOR EACH ROW EXECUTE FUNCTION enforce_next_version_number();

-- Note versions: drafts take working versions, a signed note only takes amendments,
-- an entered-in-error note takes nothing.
CREATE FUNCTION enforce_note_version_rules() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  note_status "ClinicalNoteStatus";
BEGIN
  SELECT status INTO note_status FROM "ClinicalNote" WHERE id = NEW."noteId" FOR UPDATE;
  IF note_status = 'entered_in_error' THEN
    RAISE EXCEPTION 'note % is entered in error; no new versions', NEW."noteId" USING ERRCODE = 'CP003';
  ELSIF note_status = 'signed' AND NOT NEW."isAmendment" THEN
    RAISE EXCEPTION 'note % is signed; new versions must be amendments', NEW."noteId" USING ERRCODE = 'CP003';
  ELSIF note_status = 'draft' AND NEW."isAmendment" THEN
    RAISE EXCEPTION 'note % is a draft; amendments apply only to signed notes', NEW."noteId" USING ERRCODE = 'CP003';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER "ClinicalNoteVersion_rules" BEFORE INSERT ON "ClinicalNoteVersion"
  FOR EACH ROW EXECUTE FUNCTION enforce_note_version_rules();

-- Once signed, a note header is frozen except for moving to an amendment version or
-- being marked entered in error.
CREATE FUNCTION freeze_signed_note() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'signed' AND (
    NEW."patientId", NEW."encounterId", NEW."authorPractitionerId", NEW."noteType",
    NEW."signedAt", NEW."signedByPractitionerId", NEW."organizationId"
  ) IS DISTINCT FROM (
    OLD."patientId", OLD."encounterId", OLD."authorPractitionerId", OLD."noteType",
    OLD."signedAt", OLD."signedByPractitionerId", OLD."organizationId"
  ) THEN
    RAISE EXCEPTION 'signed note % is frozen', OLD.id USING ERRCODE = 'CP003';
  END IF;
  IF OLD.status = 'signed' AND NEW."currentVersionId" IS DISTINCT FROM OLD."currentVersionId"
     AND NOT EXISTS (SELECT 1 FROM "ClinicalNoteVersion" v
                     WHERE v.id = NEW."currentVersionId" AND v."isAmendment") THEN
    RAISE EXCEPTION 'signed note % can only move to an amendment version', OLD.id USING ERRCODE = 'CP003';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER "ClinicalNote_freeze_signed" BEFORE UPDATE ON "ClinicalNote"
  FOR EACH ROW EXECUTE FUNCTION freeze_signed_note();

-- An Encounter records a visit that took place, so its appointment must not be pending,
-- cancelled or a no-show.
CREATE FUNCTION enforce_encounter_appointment() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  appt_status "AppointmentStatus";
BEGIN
  IF NEW."appointmentId" IS NOT NULL THEN
    SELECT status INTO appt_status FROM "Appointment" WHERE id = NEW."appointmentId";
    IF appt_status NOT IN ('checked_in', 'in_progress', 'completed') THEN
      RAISE EXCEPTION 'encounter needs an appointment that took place (status %)', appt_status
        USING ERRCODE = 'CP003';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER "Encounter_appointment_took_place" BEFORE INSERT OR UPDATE OF "appointmentId" ON "Encounter"
  FOR EACH ROW EXECUTE FUNCTION enforce_encounter_appointment();
