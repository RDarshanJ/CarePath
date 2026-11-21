/**
 * Fixtures for the WP 6.1 admin tests, written straight to Postgres (a repo.ts file, so it may
 * use the Prisma client). Every row takes explicit timestamps so a fixed clock decides windows.
 */
import { randomUUID } from "node:crypto";
import type { Db } from "../../../src/core/db/repo.js";
import type { OrgFixture } from "../repo.js";

export async function setPatientStatusActive(db: Db, patientId: string): Promise<void> {
  const p = await db.patient.findUniqueOrThrow({
    where: { id: patientId },
    select: { status: true },
  });
  if (p.status === "intake_incomplete") {
    await db.patient.update({ where: { id: patientId }, data: { status: "awaiting_assignment" } });
  }
  await db.patient.update({ where: { id: patientId }, data: { status: "active" } });
}

export async function makePatient(
  db: Db,
  org: OrgFixture,
  input: {
    createdAt: Date;
    name?: string;
    intake?: "submitted" | "reviewed" | "in_progress" | null;
    active?: boolean;
  },
): Promise<string> {
  const p = await db.patient.create({
    data: {
      organizationId: org.orgId,
      mrn: `MRN-${randomUUID().slice(0, 8)}`,
      givenName: input.name ?? "Casey",
      familyName: `Metric-${randomUUID().slice(0, 4)}`,
      birthDate: new Date("1980-01-01"),
      createdAt: input.createdAt,
    },
    select: { id: true },
  });
  if (input.intake) {
    await db.intakeAssessment.create({
      data: {
        organizationId: org.orgId,
        patientId: p.id,
        status: input.intake,
        currentStep: input.intake === "in_progress" ? "primary_goal" : "review",
        startedAt: input.createdAt,
        ...(input.intake !== "in_progress" ? { submittedAt: input.createdAt } : {}),
        ...(input.intake === "reviewed" ? { reviewedAt: input.createdAt } : {}),
      },
    });
  }
  if (input.active) await setPatientStatusActive(db, p.id);
  return p.id;
}

export async function setCreatedAt(db: Db, patientId: string, at: Date): Promise<void> {
  await db.patient.update({ where: { id: patientId }, data: { createdAt: at } });
}

export async function addDraftPlan(db: Db, org: OrgFixture, patientId: string): Promise<void> {
  await db.carePlan.create({
    data: {
      organizationId: org.orgId,
      patientId,
      title: "Draft",
      createdByPractitionerId: org.therapist.practitionerId,
    },
  });
}

export async function addCareTeam(db: Db, org: OrgFixture, patientId: string, since: Date) {
  const team = await db.careTeam.create({
    data: { organizationId: org.orgId, patientId, name: "Care team" },
    select: { id: true },
  });
  await db.careTeamMember.create({
    data: {
      organizationId: org.orgId,
      careTeamId: team.id,
      userId: org.otherTherapist.userId,
      role: "primary_therapist",
      startedAt: since,
    },
  });
}

export async function makeAppointment(
  db: Db,
  org: OrgFixture,
  input: {
    patientId: string;
    startsAt: Date;
    minutes?: number;
    status:
      | "booked"
      | "checked_in"
      | "completed"
      | "no_show"
      | "cancelled_by_patient"
      | "cancelled_by_clinic";
    createdAt: Date;
    slotId?: string | null;
    rescheduledFromId?: string | null;
  },
): Promise<string> {
  const cancelled = input.status.startsWith("cancelled");
  const row = await db.appointment.create({
    data: {
      organizationId: org.orgId,
      patientId: input.patientId,
      practitionerId: org.therapist.practitionerId,
      slotId: input.slotId ?? null,
      type: "follow_up",
      status: input.status,
      startsAt: input.startsAt,
      endsAt: new Date(input.startsAt.getTime() + (input.minutes ?? 60) * 60_000),
      bookedTimezone: "America/Phoenix",
      createdAt: input.createdAt,
      rescheduledFromId: input.rescheduledFromId ?? null,
      ...(cancelled
        ? {
            cancelledAt: input.createdAt,
            cancellationReason: "Synthetic reason",
            cancelledByUserId:
              input.status === "cancelled_by_clinic" ? org.coordinator.userId : null,
          }
        : {}),
    },
    select: { id: true },
  });
  return row.id;
}

export async function markSlotBooked(db: Db, slotId: string): Promise<void> {
  await db.availabilitySlot.update({ where: { id: slotId }, data: { status: "booked" } });
}

export async function makeTask(
  db: Db,
  org: OrgFixture,
  input: {
    patientId: string;
    ruleId: string;
    createdAt: Date;
    status: "open" | "in_review" | "resolved";
  },
): Promise<string> {
  const row = await db.reviewTask.create({
    data: {
      organizationId: org.orgId,
      patientId: input.patientId,
      ruleId: input.ruleId,
      dedupeKey: randomUUID(),
      explanation: "Synthetic explanation that must never reach the metrics.",
      priority: 50,
      status: input.status === "resolved" ? "open" : input.status,
      createdAt: input.createdAt,
    },
    select: { id: true },
  });
  if (input.status === "resolved") {
    await db.reviewTask.update({
      where: { id: row.id },
      data: {
        status: "resolved",
        resolvedAt: input.createdAt,
        resolvedByUserId: org.coordinator.userId,
      },
    });
  }
  return row.id;
}

/** One completed activity of an exercise, in its own completed session. */
export async function makeDoneActivity(
  db: Db,
  org: OrgFixture,
  input: { patientId: string; versionId: string; assignmentId: string; completedAt: Date },
): Promise<void> {
  const s = await db.exerciseSession.create({
    data: {
      organizationId: org.orgId,
      patientId: input.patientId,
      carePlanVersionId: input.versionId,
      status: "completed",
      startedAt: new Date(input.completedAt.getTime() - 600_000),
      completedAt: input.completedAt,
    },
    select: { id: true },
  });
  await db.sessionActivity.create({
    data: {
      organizationId: org.orgId,
      sessionId: s.id,
      assignmentId: input.assignmentId,
      status: "completed",
      completedSets: 2,
      completedReps: 10,
      completedAt: input.completedAt,
    },
  });
}

export async function assignmentsOf(db: Db, versionId: string) {
  return db.exerciseAssignment.findMany({
    where: { carePlanVersionId: versionId },
    orderBy: { position: "asc" },
    select: { id: true, exerciseId: true, position: true },
  });
}

/** Independent SQL counts for the reconciliation test (AC-H3). */
export async function sqlCounts(db: Db, orgId: string, from: Date, to: Date) {
  const one = async (q: Promise<{ n: bigint | number | null }[]>) => Number((await q)[0]?.n ?? 0);
  return {
    accounts: await one(
      db.$queryRaw`SELECT count(*) AS n FROM "Patient" WHERE "organizationId" = ${orgId}::uuid AND "createdAt" >= ${from} AND "createdAt" <= ${to}`,
    ),
    submitted: await one(
      db.$queryRaw`SELECT count(*) AS n FROM "Patient" p WHERE p."organizationId" = ${orgId}::uuid AND p."createdAt" >= ${from} AND p."createdAt" <= ${to} AND EXISTS (SELECT 1 FROM "IntakeAssessment" i WHERE i."patientId" = p.id AND i.status IN ('submitted','reviewed'))`,
    ),
    publishedMinutes: await one(
      db.$queryRaw`SELECT coalesce(sum(extract(epoch FROM "endsAt" - "startsAt") / 60), 0) AS n FROM "AvailabilitySlot" WHERE "organizationId" = ${orgId}::uuid AND status IN ('open','booked') AND "startsAt" >= ${from} AND "startsAt" <= ${to}`,
    ),
    usedMinutes: await one(
      db.$queryRaw`SELECT coalesce(sum(extract(epoch FROM s."endsAt" - s."startsAt") / 60), 0) AS n FROM "AvailabilitySlot" s WHERE s."organizationId" = ${orgId}::uuid AND s.status IN ('open','booked') AND s."startsAt" >= ${from} AND s."startsAt" <= ${to} AND EXISTS (SELECT 1 FROM "Appointment" a WHERE a."slotId" = s.id AND a.status IN ('booked','checked_in','in_progress','completed'))`,
    ),
    booked: await one(
      db.$queryRaw`SELECT count(*) AS n FROM "Appointment" WHERE "organizationId" = ${orgId}::uuid AND "createdAt" >= ${from} AND "createdAt" <= ${to}`,
    ),
    cancelled: await one(
      db.$queryRaw`SELECT count(*) AS n FROM "Appointment" WHERE "organizationId" = ${orgId}::uuid AND "createdAt" >= ${from} AND "createdAt" <= ${to} AND status IN ('cancelled_by_patient','cancelled_by_clinic')`,
    ),
    activePatients: await one(
      db.$queryRaw`SELECT count(*) AS n FROM "Patient" WHERE "organizationId" = ${orgId}::uuid AND status = 'active'`,
    ),
    activeWithPlan: await one(
      db.$queryRaw`SELECT count(*) AS n FROM "Patient" p WHERE p."organizationId" = ${orgId}::uuid AND p.status = 'active' AND EXISTS (SELECT 1 FROM "CarePlan" c WHERE c."patientId" = p.id AND c.status IN ('draft','active','on_hold') AND c."currentVersionId" IS NOT NULL)`,
    ),
    pending: await one(
      db.$queryRaw`SELECT count(*) AS n FROM "ReviewTask" WHERE "organizationId" = ${orgId}::uuid AND status IN ('open','in_review')`,
    ),
  };
}

export async function auditCount(db: Db, orgId: string, eventName: string): Promise<number> {
  return db.auditEvent.count({ where: { organizationId: orgId, eventName } });
}

export async function insertAudit(
  db: Db,
  input: {
    orgId: string | null;
    occurredAt: Date;
    eventName: string;
    action?: "C" | "R" | "U" | "D" | "E";
    outcome?: "success" | "minor_failure" | "serious_failure" | "major_failure";
    actorUserId?: string | null;
    actorRole?: "patient" | "physical_therapist" | "care_coordinator" | "clinic_admin" | null;
    resourceType?: string | null;
    resourceId?: string | null;
    patientId?: string | null;
    id?: string;
  },
): Promise<string> {
  const row = await db.auditEvent.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      organizationId: input.orgId,
      occurredAt: input.occurredAt,
      eventName: input.eventName,
      action: input.action ?? "R",
      outcome: input.outcome ?? "success",
      actorType: input.actorUserId ? "user" : "anonymous",
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      patientId: input.patientId ?? null,
      metadata: { route: "/fixture" },
    },
    select: { id: true },
  });
  return row.id;
}

export async function enrollmentCodeRow(db: Db, id: string) {
  return db.enrollmentCode.findUniqueOrThrow({ where: { id } });
}

export async function allColumnsOf(db: Db, id: string): Promise<string> {
  const rows = await db.$queryRaw<unknown[]>`SELECT * FROM "EnrollmentCode" WHERE id = ${id}::uuid`;
  return JSON.stringify(rows);
}
