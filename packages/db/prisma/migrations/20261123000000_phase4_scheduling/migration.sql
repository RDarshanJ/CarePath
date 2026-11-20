-- WP 4.1, checkpoint C2 section 2: appointment and slot consistency. Hand-written; Prisma
-- cannot express triggers. No table or column changes, so schema.prisma is unchanged.
--
-- Already in place from 20261120053116_constraints and kept as the last line of defence:
--   "Appointment_practitioner_no_overlap", "Appointment_patient_no_overlap" (23P01, mapped to
--   409 booking_conflict), "AvailabilitySlot_practitioner_no_overlap", and the partial unique
--   index "Appointment_slot_live_key": at most one non-cancelled appointment per slot.
--   The composite foreign key (slotId, organizationId) -> AvailabilitySlot(id, organizationId)
--   already guarantees that an appointment and its slot share the organization.
--
-- Added here: an appointment with a slot must match it. Same practitioner, and
-- [startsAt, endsAt) inside the slot's [startsAt, endsAt). Raised as CP003 (domain rule, mapped
-- to 409 rule_violation), one message per condition so each has its own rejection test.
-- slotId stays nullable for imported history only; the API never books without a slot.

CREATE FUNCTION enforce_appointment_slot() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  s record;
BEGIN
  IF NEW."slotId" IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT "practitionerId", "startsAt", "endsAt" INTO s
    FROM "AvailabilitySlot"
    WHERE id = NEW."slotId" AND "organizationId" = NEW."organizationId";
  IF NOT FOUND THEN
    -- The foreign key reports a missing slot; nothing to compare here.
    RETURN NEW;
  END IF;
  IF NEW."practitionerId" <> s."practitionerId" THEN
    RAISE EXCEPTION 'appointment practitioner does not match its slot'
      USING ERRCODE = 'CP003', TABLE = 'Appointment', COLUMN = 'practitionerId';
  END IF;
  IF NEW."startsAt" < s."startsAt" THEN
    RAISE EXCEPTION 'appointment starts before its slot'
      USING ERRCODE = 'CP003', TABLE = 'Appointment', COLUMN = 'startsAt';
  END IF;
  IF NEW."endsAt" > s."endsAt" THEN
    RAISE EXCEPTION 'appointment ends after its slot'
      USING ERRCODE = 'CP003', TABLE = 'Appointment', COLUMN = 'endsAt';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "Appointment_matches_slot"
  BEFORE INSERT OR UPDATE OF "slotId", "practitionerId", "startsAt", "endsAt" ON "Appointment"
  FOR EACH ROW EXECUTE FUNCTION enforce_appointment_slot();

-- A slot that appointments point at cannot be moved or handed to another practitioner from
-- under them: the same three conditions, checked from the slot side.
CREATE FUNCTION enforce_slot_keeps_appointments() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Appointment" a
    WHERE a."slotId" = NEW.id
      AND (a."practitionerId" <> NEW."practitionerId"
           OR a."startsAt" < NEW."startsAt"
           OR a."endsAt" > NEW."endsAt")
  ) THEN
    RAISE EXCEPTION 'slot change would leave an appointment outside it'
      USING ERRCODE = 'CP003', TABLE = 'AvailabilitySlot';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "AvailabilitySlot_keeps_appointments"
  BEFORE UPDATE OF "practitionerId", "startsAt", "endsAt" ON "AvailabilitySlot"
  FOR EACH ROW EXECUTE FUNCTION enforce_slot_keeps_appointments();

-- The day agenda (GET /appointments?date&practitionerId) and the reminder job read by
-- practitioner and time, and by status and reminder state.
CREATE INDEX "Appointment_reminder_due_idx" ON "Appointment" ("organizationId", "startsAt")
  WHERE status = 'booked' AND "reminderSentAt" IS NULL;
