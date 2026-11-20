-- WP 5.2: AI review workflow. The first three statements are generated from schema.prisma; the
-- rest is hand-written (Prisma cannot express partial indexes, checks or triggers).
--
-- 1. AIReviewDecision gains `revised`: an append-only working edit by a clinician. It is not a
--    decision. The generation's one decision is approved, approved_with_edits or rejected.
-- 2. AIGeneration.previousGenerationId links a regeneration to the generation it replaces.
--
-- The new enum value cannot be used as a literal in the transaction that adds it, so the
-- predicates below compare `decision::text` or list the decision values explicitly.

-- AlterEnum
ALTER TYPE "AIReviewDecision" ADD VALUE 'revised';

-- AlterTable
ALTER TABLE "AIGeneration" ADD COLUMN     "previousGenerationId" UUID;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_previousGenerationId_organizationId_fkey" FOREIGN KEY ("previousGenerationId", "organizationId") REFERENCES "AIGeneration"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- At most one decision per generation (one gated decision, design research M-ai-summaries).
CREATE UNIQUE INDEX "AIReview_one_decision_key" ON "AIReview"("generationId")
  WHERE decision IN ('approved', 'approved_with_edits', 'rejected');

-- A revision carries the full working state it records.
ALTER TABLE "AIReview"
  ADD CONSTRAINT "AIReview_revision_check" CHECK (decision::text <> 'revised' OR "editedOutput" IS NOT NULL);

-- Nothing is recorded after the decision, and only a succeeded generation can be reviewed.
CREATE FUNCTION enforce_ai_review_order() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  gen_status text;
BEGIN
  SELECT status::text INTO gen_status FROM "AIGeneration"
    WHERE id = NEW."generationId" AND "organizationId" = NEW."organizationId" FOR UPDATE;
  IF gen_status IS DISTINCT FROM 'succeeded' THEN
    RAISE EXCEPTION 'generation % is not succeeded; it cannot be reviewed', NEW."generationId"
      USING ERRCODE = 'CP003', TABLE = TG_TABLE_NAME;
  END IF;
  IF EXISTS (SELECT 1 FROM "AIReview" r WHERE r."generationId" = NEW."generationId"
             AND r.decision::text IN ('approved', 'approved_with_edits', 'rejected')) THEN
    RAISE EXCEPTION 'generation % already has a decision', NEW."generationId"
      USING ERRCODE = 'CP003', TABLE = TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "AIReview_order" BEFORE INSERT ON "AIReview"
  FOR EACH ROW EXECUTE FUNCTION enforce_ai_review_order();

-- A regeneration follows a generation of the same patient and kind, never itself.
ALTER TABLE "AIGeneration"
  ADD CONSTRAINT "AIGeneration_not_self_previous_check" CHECK ("previousGenerationId" IS NULL OR "previousGenerationId" <> id);

CREATE TRIGGER "AIGeneration_same_patient_previous"
  BEFORE INSERT OR UPDATE OF "patientId", "previousGenerationId" ON "AIGeneration"
  FOR EACH ROW EXECUTE FUNCTION enforce_same_parent('patientId', 'previousGenerationId',
    'SELECT EXISTS (SELECT 1 FROM "AIGeneration" g WHERE g.id = $1 AND g."patientId" = $2)');

-- A completed generation is a record: its row never changes once succeeded or failed
-- (AC-F4: the original generation is kept). Only pending rows may move to a final status.
CREATE FUNCTION freeze_completed_generation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AIGeneration rows are never deleted' USING ERRCODE = 'CP002', TABLE = TG_TABLE_NAME;
  END IF;
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'generation % is complete and cannot change', OLD.id
      USING ERRCODE = 'CP002', TABLE = TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "AIGeneration_frozen" BEFORE UPDATE OR DELETE ON "AIGeneration"
  FOR EACH ROW EXECUTE FUNCTION freeze_completed_generation();

-- 3. Notes (CR-8, demo rules pending clinical governance review): a signed note may be marked
--    entered in error by its author or a clinic administrator, with a reason. Generated from
--    schema.prisma:
ALTER TABLE "ClinicalNote" ADD COLUMN     "enteredInErrorAt" TIMESTAMPTZ(3),
ADD COLUMN     "enteredInErrorByUserId" UUID,
ADD COLUMN     "enteredInErrorReason" TEXT;

ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_enteredInErrorByUserId_organizationId_fkey" FOREIGN KEY ("enteredInErrorByUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: the three columns are set exactly when the status is entered_in_error, with a
-- non-blank reason, and an entered-in-error note never changes again (the status table already
-- has no transition out of entered_in_error).
ALTER TABLE "ClinicalNote"
  ADD CONSTRAINT "ClinicalNote_entered_in_error_check" CHECK (
    (status = 'entered_in_error') = ("enteredInErrorAt" IS NOT NULL)
    AND ("enteredInErrorAt" IS NULL) = ("enteredInErrorByUserId" IS NULL)
    AND ("enteredInErrorAt" IS NULL OR btrim(coalesce("enteredInErrorReason", '')) <> '')
    AND ("enteredInErrorAt" IS NOT NULL OR "enteredInErrorReason" IS NULL));

CREATE FUNCTION freeze_entered_in_error_note() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'entered_in_error' THEN
    RAISE EXCEPTION 'note % is entered in error and cannot change', OLD.id
      USING ERRCODE = 'CP003', TABLE = TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "ClinicalNote_freeze_entered_in_error" BEFORE UPDATE ON "ClinicalNote"
  FOR EACH ROW EXECUTE FUNCTION freeze_entered_in_error_note();
