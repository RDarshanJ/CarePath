-- WP 5.6b (checkpoint C3, fixes B1 and B4). Hand-written; no Prisma model change.

-- B1, ruling 4.3: a permission of its own for marking a signed note entered in error, held by
-- the clinic administrator only. The TypeScript source of truth is
-- apps/api/src/core/authz/permissions.ts; a test asserts the Role rows equal that map.
UPDATE "Role"
SET "permissions" = array_append("permissions", 'note.mark_entered_in_error')
WHERE "key" = 'clinic_admin' AND NOT ('note.mark_entered_in_error' = ANY ("permissions"));

-- B4: at most one signed note per encounter. A note marked entered in error leaves the index,
-- so the visit can be documented again by a corrected note. Drafts are not limited.
CREATE UNIQUE INDEX "ClinicalNote_one_signed_per_encounter_key" ON "ClinicalNote" ("encounterId")
  WHERE status = 'signed' AND "encounterId" IS NOT NULL;
