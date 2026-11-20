/** Rows for the FHIR export and import tests (WP 5.4). A repo.ts file, so it may use the client. */
import type { Db } from "../../../src/core/db/repo.js";

export async function addGoal(db: Db, orgId: string, patientId: string, carePlanId: string) {
  return db.goal.create({
    data: {
      organizationId: orgId,
      patientId,
      carePlanId,
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

/** Row counts of the batch 1 tables in one organization. */
export async function fhirCounts(db: Db, orgId: string) {
  const where = { organizationId: orgId };
  const [patients, practitioners, carePlans, versions, assignments, goals, observations] =
    await Promise.all([
      db.patient.count({ where }),
      db.practitioner.count({ where }),
      db.carePlan.count({ where }),
      db.carePlanVersion.count({ where }),
      db.exerciseAssignment.count({ where }),
      db.goal.count({ where }),
      db.observation.count({ where }),
    ]);
  return { patients, practitioners, carePlans, versions, assignments, goals, observations };
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
