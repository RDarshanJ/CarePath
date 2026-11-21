-- WP 6.1 (admin API). Eligibility codes can be revoked by staff. Permissions need no change:
-- enrollment.manage, metrics.read, audit.read and availability.manage already exist.

ALTER TABLE "EnrollmentCode" ADD COLUMN "revokedAt" TIMESTAMPTZ(3);

-- A code is redeemed or revoked, never both.
ALTER TABLE "EnrollmentCode" ADD CONSTRAINT "EnrollmentCode_revoked_unredeemed_check"
  CHECK ("revokedAt" IS NULL OR "redeemedAt" IS NULL);
