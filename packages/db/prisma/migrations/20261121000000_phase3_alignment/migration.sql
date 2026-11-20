-- AlterEnum
ALTER TYPE "AuditActorType" ADD VALUE 'anonymous';

-- AlterEnum
ALTER TYPE "ExerciseSessionStatus" ADD VALUE 'stopped_discomfort';

-- AlterTable
ALTER TABLE "ExerciseSession" ADD COLUMN     "stoppedAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "replyTimeText" TEXT;

-- AlterTable
ALTER TABLE "SessionActivity" ADD COLUMN     "skipReason" TEXT;

-- CreateTable
CREATE TABLE "EnrollmentCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "redeemedAt" TIMESTAMPTZ(3),
    "redeemedByPatientId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentCode_codeHash_key" ON "EnrollmentCode"("codeHash");

-- CreateIndex
CREATE INDEX "EnrollmentCode_organizationId_expiresAt_idx" ON "EnrollmentCode"("organizationId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentCode_redeemedByPatientId_key" ON "EnrollmentCode"("redeemedByPatientId");

-- AddForeignKey
ALTER TABLE "EnrollmentCode" ADD CONSTRAINT "EnrollmentCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentCode" ADD CONSTRAINT "EnrollmentCode_redeemedByPatientId_organizationId_fkey" FOREIGN KEY ("redeemedByPatientId", "organizationId") REFERENCES "Patient"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Checkpoint C1, WP 3.0 M2: constraints Prisma cannot express.
-- The new enum values cannot be used as enum literals in the transaction that adds them, so
-- the checks below compare the status columns as text.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Anonymous audit actor (ruling 3.1): never carries a user id.
-- ---------------------------------------------------------------------------
ALTER TABLE "AuditEvent"
  ADD CONSTRAINT "AuditEvent_anonymous_actor_check" CHECK ("actorType"::text <> 'anonymous' OR "actorUserId" IS NULL);

-- ---------------------------------------------------------------------------
-- 2. Skip reason and stop for discomfort (AC-C3, AC-C4).
-- ---------------------------------------------------------------------------
ALTER TABLE "SessionActivity"
  ADD CONSTRAINT "SessionActivity_skip_reason_check" CHECK (
    "skipReason" IS NULL OR (status::text = 'skipped' AND char_length(btrim("skipReason")) BETWEEN 1 AND 500));

ALTER TABLE "ExerciseSession"
  ADD CONSTRAINT "ExerciseSession_stopped_check" CHECK (
    (status::text = 'stopped_discomfort') = ("stoppedAt" IS NOT NULL));

-- StatusTransition is read-only by trigger. The migration lifts that for its own inserts.
ALTER TABLE "StatusTransition" DISABLE TRIGGER "StatusTransition_read_only";
INSERT INTO "StatusTransition" ("tableName", "column", "fromStatus", "toStatus") VALUES
  ('ExerciseSession', 'status', 'in_progress', 'stopped_discomfort'),
  ('ExerciseSession', 'status', 'paused', 'stopped_discomfort');
ALTER TABLE "StatusTransition" ENABLE TRIGGER "StatusTransition_read_only";

-- ---------------------------------------------------------------------------
-- 3. Enrollment codes and clinic settings.
-- ---------------------------------------------------------------------------
ALTER TABLE "EnrollmentCode"
  ADD CONSTRAINT "EnrollmentCode_redeemed_check" CHECK (("redeemedAt" IS NULL) = ("redeemedByPatientId" IS NULL)),
  ADD CONSTRAINT "EnrollmentCode_hash_check" CHECK ("codeHash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "EnrollmentCode_label_check" CHECK (char_length(btrim(label)) BETWEEN 1 AND 40);

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_phone_check" CHECK (phone IS NULL OR char_length(btrim(phone)) BETWEEN 3 AND 40),
  ADD CONSTRAINT "Organization_reply_time_check" CHECK ("replyTimeText" IS NULL OR char_length(btrim("replyTimeText")) BETWEEN 1 AND 200);

-- ---------------------------------------------------------------------------
-- 4. Same-patient parents (C1, WP 2.3 defect 1).
-- Composite foreign keys prove a parent is in the same organization. This trigger proves it
-- belongs to the same patient (or, for SessionActivity, the same plan version as the session).
--   TG_ARGV[0]  column on NEW holding the value the parent must match
--   TG_ARGV[1]  foreign-key column on NEW, NULL skips the check
--   TG_ARGV[2]  SQL returning true when parent $1 matches value $2
-- Violations raise CP003. Appointment and slot consistency is WP 4.1 (C1 section 1).
-- ---------------------------------------------------------------------------
CREATE FUNCTION enforce_same_parent() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  match_col text := TG_ARGV[0];
  fk_col text := TG_ARGV[1];
  fk_value uuid := (to_jsonb(NEW) ->> fk_col)::uuid;
  match_value uuid := (to_jsonb(NEW) ->> match_col)::uuid;
  ok boolean;
BEGIN
  IF fk_value IS NULL THEN
    RETURN NEW;
  END IF;
  EXECUTE TG_ARGV[2] INTO ok USING fk_value, match_value;
  IF ok IS NOT TRUE THEN
    RAISE EXCEPTION '%.% must reference a row with the same %', TG_TABLE_NAME, fk_col, match_col
      USING ERRCODE = 'CP003', TABLE = TG_TABLE_NAME, COLUMN = fk_col;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "ExerciseSession_same_patient_version"
  BEFORE INSERT OR UPDATE OF "patientId", "carePlanVersionId" ON "ExerciseSession"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_parent('patientId', 'carePlanVersionId',
    'SELECT EXISTS (SELECT 1 FROM "CarePlanVersion" v JOIN "CarePlan" p ON p.id = v."carePlanId" WHERE v.id = $1 AND p."patientId" = $2)');

CREATE TRIGGER "PatientCheckIn_same_patient_session"
  BEFORE INSERT OR UPDATE OF "patientId", "sessionId" ON "PatientCheckIn"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_parent('patientId', 'sessionId',
    'SELECT EXISTS (SELECT 1 FROM "ExerciseSession" s WHERE s.id = $1 AND s."patientId" = $2)');

CREATE TRIGGER "Observation_same_patient_check_in"
  BEFORE INSERT OR UPDATE OF "patientId", "checkInId" ON "Observation"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_parent('patientId', 'checkInId',
    'SELECT EXISTS (SELECT 1 FROM "PatientCheckIn" c WHERE c.id = $1 AND c."patientId" = $2)');

CREATE TRIGGER "Observation_same_patient_session"
  BEFORE INSERT OR UPDATE OF "patientId", "sessionId" ON "Observation"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_parent('patientId', 'sessionId',
    'SELECT EXISTS (SELECT 1 FROM "ExerciseSession" s WHERE s.id = $1 AND s."patientId" = $2)');

CREATE TRIGGER "Goal_same_patient_care_plan"
  BEFORE INSERT OR UPDATE OF "patientId", "carePlanId" ON "Goal"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_parent('patientId', 'carePlanId',
    'SELECT EXISTS (SELECT 1 FROM "CarePlan" p WHERE p.id = $1 AND p."patientId" = $2)');

CREATE TRIGGER "SessionActivity_same_plan_version"
  BEFORE INSERT OR UPDATE OF "sessionId", "assignmentId" ON "SessionActivity"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_parent('sessionId', 'assignmentId',
    'SELECT EXISTS (SELECT 1 FROM "ExerciseAssignment" a JOIN "ExerciseSession" s ON s."carePlanVersionId" = a."carePlanVersionId" WHERE a.id = $1 AND s.id = $2)');

CREATE TRIGGER "ClinicalNote_same_patient_encounter"
  BEFORE INSERT OR UPDATE OF "patientId", "encounterId" ON "ClinicalNote"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_parent('patientId', 'encounterId',
    'SELECT EXISTS (SELECT 1 FROM "Encounter" e WHERE e.id = $1 AND e."patientId" = $2)');

-- The checks above read the parent at insert time. Re-pointing a parent at another patient
-- (or a session at another plan version) afterwards would undo them, so those columns are
-- fixed once written. CarePlanVersion and ExerciseAssignment are already append-only.
CREATE FUNCTION reject_reparent() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  col text := TG_ARGV[0];
BEGIN
  IF (to_jsonb(NEW) ->> col) IS DISTINCT FROM (to_jsonb(OLD) ->> col) THEN
    RAISE EXCEPTION '%.% cannot change once written', TG_TABLE_NAME, col
      USING ERRCODE = 'CP003', TABLE = TG_TABLE_NAME, COLUMN = col;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "CarePlan_fixed_patient" BEFORE UPDATE OF "patientId" ON "CarePlan"
  FOR EACH ROW EXECUTE FUNCTION reject_reparent('patientId');
CREATE TRIGGER "ExerciseSession_fixed_patient" BEFORE UPDATE OF "patientId" ON "ExerciseSession"
  FOR EACH ROW EXECUTE FUNCTION reject_reparent('patientId');
CREATE TRIGGER "ExerciseSession_fixed_version" BEFORE UPDATE OF "carePlanVersionId" ON "ExerciseSession"
  FOR EACH ROW EXECUTE FUNCTION reject_reparent('carePlanVersionId');
CREATE TRIGGER "PatientCheckIn_fixed_patient" BEFORE UPDATE OF "patientId" ON "PatientCheckIn"
  FOR EACH ROW EXECUTE FUNCTION reject_reparent('patientId');
CREATE TRIGGER "Encounter_fixed_patient" BEFORE UPDATE OF "patientId" ON "Encounter"
  FOR EACH ROW EXECUTE FUNCTION reject_reparent('patientId');
