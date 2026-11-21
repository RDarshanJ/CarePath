-- CreateEnum
CREATE TYPE "ReviewTaskEventKind" AS ENUM ('assigned', 'unassigned', 'reviewed', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "ReviewTaskEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "seq" SERIAL NOT NULL,
    "organizationId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "kind" "ReviewTaskEventKind" NOT NULL,
    "actorUserId" UUID NOT NULL,
    "practitionerId" UUID,
    "note" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewTaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewTaskEvent_taskId_occurredAt_seq_idx" ON "ReviewTaskEvent"("taskId", "occurredAt", "seq");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_organizationId_userId_scope_key_key" ON "IdempotencyKey"("organizationId", "userId", "scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTask_id_organizationId_key" ON "ReviewTask"("id", "organizationId");

-- AddForeignKey
ALTER TABLE "ReviewTaskEvent" ADD CONSTRAINT "ReviewTaskEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTaskEvent" ADD CONSTRAINT "ReviewTaskEvent_taskId_organizationId_fkey" FOREIGN KEY ("taskId", "organizationId") REFERENCES "ReviewTask"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTaskEvent" ADD CONSTRAINT "ReviewTaskEvent_actorUserId_organizationId_fkey" FOREIGN KEY ("actorUserId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTaskEvent" ADD CONSTRAINT "ReviewTaskEvent_practitionerId_organizationId_fkey" FOREIGN KEY ("practitionerId", "organizationId") REFERENCES "Practitioner"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_organizationId_fkey" FOREIGN KEY ("userId", "organizationId") REFERENCES "OrganizationMembership"("userId", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written part (Prisma cannot express checks or triggers). WP B-CR.
-- ---------------------------------------------------------------------------

-- CR-11: the task history is append-only. Assign and unassign name the practitioner; a close
-- carries its note (the same note the task stores); a note is never blank.
CREATE TRIGGER "ReviewTaskEvent_append_only" BEFORE UPDATE OR DELETE ON "ReviewTaskEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_mutation();

ALTER TABLE "ReviewTaskEvent"
  ADD CONSTRAINT "ReviewTaskEvent_practitioner_check" CHECK (
    (kind::text IN ('assigned', 'unassigned')) = ("practitionerId" IS NOT NULL)),
  ADD CONSTRAINT "ReviewTaskEvent_note_check" CHECK (
    note IS NULL OR btrim(note) <> ''),
  ADD CONSTRAINT "ReviewTaskEvent_close_note_check" CHECK (
    kind::text NOT IN ('resolved', 'dismissed') OR note IS NOT NULL);

-- CR-17: a stored answer is a success body; the key is short and the window is positive.
ALTER TABLE "IdempotencyKey"
  ADD CONSTRAINT "IdempotencyKey_key_check" CHECK (char_length("key") BETWEEN 1 AND 128),
  ADD CONSTRAINT "IdempotencyKey_status_check" CHECK ("statusCode" BETWEEN 200 AND 299),
  ADD CONSTRAINT "IdempotencyKey_window_check" CHECK ("expiresAt" > "createdAt");
