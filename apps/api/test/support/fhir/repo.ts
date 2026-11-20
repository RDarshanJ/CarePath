/** Rows for the FHIR export and import tests (WP 5.4). A repo.ts file, so it may use the client. */
import type { Db } from "../../../src/core/db/repo.js";

export async function addGoal(
  db: Db,
  orgId: string,
  patientId: string,
  carePlanId: string,
  addressesConditionId: string | null = null,
) {
  return db.goal.create({
    data: {
      organizationId: orgId,
      patientId,
      carePlanId,
      addressesConditionId,
      description: "Climb one flight of stairs without stopping",
      lifecycleStatus: "active",
      measureSystem: "urn:carepath:goal-measure",
      measureCode: "flights",
      targetValue: 1,
      targetUnit: "flights",
      startDate: new Date("2026-10-01T00:00:00Z"),
      dueDate: new Date("2026-11-26T00:00:00Z"),
    },
    select: { id: true },
  });
}

/**
 * Batch 2 rows for one patient: a completed appointment with its visit (encounter), a condition
 * recorded at that visit, a note signed by the therapist and then amended, and a second note
 * left as a draft. Only the signed note may appear in an export, as two DocumentReferences.
 */
export async function addVisitAndNotes(
  db: Db,
  orgId: string,
  patientId: string,
  therapist: { practitionerId: string; userId: string },
  now: Date,
) {
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000);
  const appt = await db.appointment.create({
    data: {
      organizationId: orgId,
      patientId,
      practitionerId: therapist.practitionerId,
      type: "follow_up",
      status: "completed",
      startsAt: at(3 * 24 * 60),
      endsAt: at(3 * 24 * 60 - 45),
      bookedTimezone: "America/Phoenix",
      reason: "Knee review",
    },
    select: { id: true },
  });
  const enc = await db.encounter.create({
    data: {
      organizationId: orgId,
      patientId,
      practitionerId: therapist.practitionerId,
      appointmentId: appt.id,
      class: "AMB",
      typeCode: "PT-FOLLOW-UP",
      typeDisplay: "Physical therapy follow-up visit",
      status: "finished",
      startedAt: at(3 * 24 * 60),
      endedAt: at(3 * 24 * 60 - 40),
    },
    select: { id: true },
  });
  const condition = await db.condition.create({
    data: {
      organizationId: orgId,
      patientId,
      encounterId: enc.id,
      codeSystem: "urn:carepath:synthetic-condition",
      code: "knee-pain",
      display: "Knee pain (synthetic)",
      clinicalStatus: "active",
      verificationStatus: "confirmed",
      onsetDate: new Date("2026-08-01T00:00:00Z"),
      recordedByPractitionerId: therapist.practitionerId,
      recordedAt: at(3 * 24 * 60 - 30),
    },
    select: { id: true },
  });
  const sections = (s: string) => ({
    subjective: `Reports home sessions. ${s}`,
    objective: "Knee flexion 110 degrees (synthetic).",
    assessment: "Synthetic example, not a clinical assessment.",
    plan: "Continue the plan.",
  });
  const note = await db.clinicalNote.create({
    data: {
      organizationId: orgId,
      patientId,
      encounterId: enc.id,
      authorPractitionerId: therapist.practitionerId,
    },
    select: { id: true },
  });
  const v1 = await db.clinicalNoteVersion.create({
    data: {
      organizationId: orgId,
      noteId: note.id,
      versionNumber: 1,
      ...sections("Signed text."),
      createdByUserId: therapist.userId,
      createdAt: at(3 * 24 * 60 - 60),
    },
    select: { id: true },
  });
  await db.clinicalNote.update({ where: { id: note.id }, data: { currentVersionId: v1.id } });
  await db.clinicalNote.update({
    where: { id: note.id },
    data: {
      status: "signed",
      signedAt: at(3 * 24 * 60 - 70),
      signedByPractitionerId: therapist.practitionerId,
    },
  });
  const v2 = await db.clinicalNoteVersion.create({
    data: {
      organizationId: orgId,
      noteId: note.id,
      versionNumber: 2,
      ...sections("Amended text."),
      isAmendment: true,
      amendmentReason: "Corrected the session count.",
      createdByUserId: therapist.userId,
      createdAt: at(2 * 24 * 60),
    },
    select: { id: true },
  });
  await db.clinicalNote.update({ where: { id: note.id }, data: { currentVersionId: v2.id } });
  const draft = await db.clinicalNote.create({
    data: {
      organizationId: orgId,
      patientId,
      authorPractitionerId: therapist.practitionerId,
    },
    select: { id: true },
  });
  const draftVersion = await db.clinicalNoteVersion.create({
    data: {
      organizationId: orgId,
      noteId: draft.id,
      versionNumber: 1,
      ...sections("Draft text that must never be exported."),
      createdByUserId: therapist.userId,
      createdAt: at(60),
    },
    select: { id: true },
  });
  return {
    appointmentId: appt.id,
    encounterId: enc.id,
    conditionId: condition.id,
    signedVersionIds: [v1.id, v2.id],
    draftNoteId: draft.id,
    draftVersionId: draftVersion.id,
  };
}

/** Gives `toOrg` exercises with the same slugs as `fromOrg`, so imported activities resolve. */
export async function copyExercises(db: Db, fromOrg: string, toOrg: string) {
  const rows = await db.exercise.findMany({ where: { organizationId: fromOrg } });
  for (const e of rows) {
    await db.exercise.create({
      data: {
        organizationId: toOrg,
        slug: e.slug,
        name: e.name,
        bodyArea: e.bodyArea,
        category: e.category,
        description: e.description,
        instructions: e.instructions,
        defaultSets: e.defaultSets,
        defaultReps: e.defaultReps,
      },
    });
  }
}

/** Row counts of the tables import writes (and the export-only ones) in one organization. */
export async function fhirCounts(db: Db, orgId: string) {
  const where = { organizationId: orgId };
  const [
    patients,
    practitioners,
    carePlans,
    versions,
    assignments,
    goals,
    observations,
    encounters,
    conditions,
    appointments,
    notes,
  ] = await Promise.all([
    db.patient.count({ where }),
    db.practitioner.count({ where }),
    db.carePlan.count({ where }),
    db.carePlanVersion.count({ where }),
    db.exerciseAssignment.count({ where }),
    db.goal.count({ where }),
    db.observation.count({ where }),
    db.encounter.count({ where }),
    db.condition.count({ where }),
    db.appointment.count({ where }),
    db.clinicalNote.count({ where }),
  ]);
  return {
    patients,
    practitioners,
    carePlans,
    versions,
    assignments,
    goals,
    observations,
    encounters,
    conditions,
    appointments,
    notes,
  };
}

/** Imported links: observations and conditions pointing at encounters, goals at conditions. */
export async function importedLinks(db: Db, orgId: string, patientIds: string[]) {
  const where = { organizationId: orgId, patientId: { in: patientIds } };
  const [observations, conditions, goals, encounters] = await Promise.all([
    db.observation.count({ where: { ...where, encounterId: { not: null } } }),
    db.condition.count({ where: { ...where, encounterId: { not: null } } }),
    db.goal.count({ where: { ...where, addressesConditionId: { not: null } } }),
    db.encounter.findMany({ where, select: { typeCode: true, class: true } }),
  ]);
  return { observations, conditions, goals, encounters };
}

export async function orgSlug(db: Db, orgId: string) {
  return (await db.organization.findUniqueOrThrow({ where: { id: orgId }, select: { slug: true } }))
    .slug;
}

export async function auditEvents(db: Db, orgId: string, eventName: string) {
  return db.auditEvent.findMany({
    where: { organizationId: orgId, eventName },
    orderBy: { occurredAt: "asc" },
  });
}

export async function importedPlans(db: Db, orgId: string) {
  return db.carePlan.findMany({
    where: { organizationId: orgId },
    select: {
      status: true,
      currentVersionId: true,
      versions: { orderBy: { versionNumber: "asc" }, select: { id: true, versionNumber: true } },
    },
  });
}
