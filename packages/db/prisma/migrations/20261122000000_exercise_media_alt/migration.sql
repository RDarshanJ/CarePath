-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "mediaAlt" TEXT;

-- An illustration always carries its description, and a description needs an illustration
-- (checkpoint C2, ruling 3.4). Prisma cannot express this; it lives here.
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_media_alt_with_path"
  CHECK (("mediaPath" IS NULL) = ("mediaAlt" IS NULL));
