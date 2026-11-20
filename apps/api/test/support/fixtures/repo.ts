/**
 * Clinical fixtures for the Phase 3 API tests, written straight to Postgres (a repo.ts file, so
 * it may use the Prisma client). Builds on createOrgFixture: exercises, review rules with the
 * demo defaults, clinic settings, and a published two-version plan for `patient`.
 */
import { randomUUID } from "node:crypto";
import { defaultReviewRuleParams, reviewRuleKeys } from "@carepath/shared/contracts";
import { hashEnrollmentCode, enrollmentCodeLabel } from "@carepath/shared/enrollment-code";
import type { Db } from "../../../src/core/db/repo.js";
import type { OrgFixture } from "../repo.js";

export interface ClinicalFixture {
  exerciseIds: string[];
  ruleIds: Record<string, string>;
  carePlanId: string;
  v1: string;
  v2: string;
  /** Assignment ids of v2, in position order. */
  v2Assignments: string[];
  /** A plan for otherPatient too (one version), so child-id tests have rows of another patient. */
  other: { carePlanId: string; v1: string };
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export async function setClinic(
  db: Db,
  orgId: string,
  settings: { timezone?: string; phone?: string | null },
): Promise<void> {
  await db.organization.update({
    where: { id: orgId },
    data: {
      timezone: settings.timezone ?? "America/Phoenix",
      phone: settings.phone === undefined ? "(555) 555-0110" : settings.phone,
      replyTimeText: "Your care team usually replies within one business day.",
    },
  });
}

async function version(
  db: Db,
  org: OrgFixture,
  carePlanId: string,
  n: number,
  exerciseIds: string[],
  publishedAt: Date,
  note: string | null,
  reps: number,
): Promise<{ id: string; assignments: string[] }> {
  const v = await db.carePlanVersion.create({
    data: {
      organizationId: org.orgId,
      carePlanId,
      versionNumber: n,
      title: "Knee strength plan",
      instructions: "Move slowly and stop if anything feels sharp.",
      changeNoteForPatient: note,
      publishedByPractitionerId: org.therapist.practitionerId,
      publishedAt,
    },
    select: { id: true },
  });
  const assignments: string[] = [];
  for (const [position, exerciseId] of exerciseIds.entries()) {
    const a = await db.exerciseAssignment.create({
      data: {
        organizationId: org.orgId,
        carePlanVersionId: v.id,
        exerciseId,
        position,
        sets: 2,
        reps,
        daysOfWeek: ALL_DAYS,
      },
      select: { id: true },
    });
    assignments.push(a.id);
  }
  return { id: v.id, assignments };
}

export async function createClinicalFixture(
  db: Db,
  org: OrgFixture,
  now: Date,
): Promise<ClinicalFixture> {
  await setClinic(db, org.orgId, {});
  const exerciseIds: string[] = [];
  for (let i = 0; i < 6; i++) {
    const e = await db.exercise.create({
      data: {
        organizationId: org.orgId,
        slug: `ex-${i}-${randomUUID().slice(0, 6)}`,
        name: `Synthetic exercise ${i + 1}`,
        bodyArea: i < 3 ? "knee" : "hip",
        category: i % 2 === 0 ? "strengthening" : "mobility",
        description: "Fictional demonstration content, not medical advice.",
        instructions: "Fictional steps.",
        defaultSets: 2,
        defaultReps: 10,
      },
      select: { id: true },
    });
    exerciseIds.push(e.id);
  }
  const ruleIds: Record<string, string> = {};
  for (const key of reviewRuleKeys) {
    const r = await db.reviewRule.create({
      data: {
        organizationId: org.orgId,
        key,
        name: key.replace(/_/g, " "),
        description: `Rule ${key}.`,
        params: defaultReviewRuleParams[key],
        priority: key === "reported_pain" ? 80 : 50,
      },
      select: { id: true },
    });
    ruleIds[key] = r.id;
  }

  const plan = await db.carePlan.create({
    data: {
      organizationId: org.orgId,
      patientId: org.patient.patientId,
      title: "Knee strength plan",
      createdByPractitionerId: org.therapist.practitionerId,
    },
    select: { id: true },
  });
  const day = 86_400_000;
  const v1 = await version(
    db,
    org,
    plan.id,
    1,
    exerciseIds.slice(0, 3),
    new Date(now.getTime() - 20 * day),
    null,
    10,
  );
  const v2 = await version(
    db,
    org,
    plan.id,
    2,
    [exerciseIds[0]!, exerciseIds[2]!, exerciseIds[3]!, exerciseIds[4]!, exerciseIds[5]!],
    new Date(now.getTime() - 5 * day),
    "Added hip work and two more reps on the first exercise.",
    12,
  );
  await db.carePlan.update({
    where: { id: plan.id },
    data: { status: "active", currentVersionId: v2.id },
  });
  await db.goal.create({
    data: {
      organizationId: org.orgId,
      patientId: org.patient.patientId,
      carePlanId: plan.id,
      description: "Climb one flight of stairs without stopping",
      lifecycleStatus: "proposed",
    },
  });
  await db.patient.update({
    where: { id: org.patient.patientId },
    data: { status: "awaiting_assignment" },
  });
  await db.patient.update({ where: { id: org.patient.patientId }, data: { status: "active" } });
  // Unread plan-change notice for v2, as publishing creates.
  await db.notification.create({
    data: {
      organizationId: org.orgId,
      userId: org.patient.userId,
      type: "care_plan_published",
      title: "Your care plan was updated",
      body: "Added hip work.",
      sourceType: "CarePlanVersion",
      sourceId: v2.id,
    },
  });

  const otherPlan = await db.carePlan.create({
    data: {
      organizationId: org.orgId,
      patientId: org.otherPatient.patientId,
      title: "Hip plan",
      createdByPractitionerId: org.otherTherapist.practitionerId,
    },
    select: { id: true },
  });
  const o1 = await db.carePlanVersion.create({
    data: {
      organizationId: org.orgId,
      carePlanId: otherPlan.id,
      versionNumber: 1,
      title: "Hip plan",
      instructions: "Fictional.",
      publishedByPractitionerId: org.otherTherapist.practitionerId,
      publishedAt: new Date(now.getTime() - 3 * day),
    },
    select: { id: true },
  });
  await db.exerciseAssignment.create({
    data: {
      organizationId: org.orgId,
      carePlanVersionId: o1.id,
      exerciseId: exerciseIds[1]!,
      position: 0,
      reps: 8,
      daysOfWeek: ALL_DAYS,
    },
  });
  await db.carePlan.update({
    where: { id: otherPlan.id },
    data: { status: "active", currentVersionId: o1.id },
  });

  return {
    exerciseIds,
    ruleIds,
    carePlanId: plan.id,
    v1: v1.id,
    v2: v2.id,
    v2Assignments: v2.assignments,
    other: { carePlanId: otherPlan.id, v1: o1.id },
  };
}

/** A fresh eligibility code for the organization. */
export async function createEnrollmentCode(
  db: Db,
  orgId: string,
  expiresAt: Date,
): Promise<string> {
  const code = `TEST-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.enrollmentCode.create({
    data: {
      organizationId: orgId,
      codeHash: hashEnrollmentCode(code),
      label: enrollmentCodeLabel(code),
      expiresAt,
    },
  });
  return code;
}

export async function auditEvents(
  db: Db,
  where: { requestId?: string; eventName?: string; organizationId?: string },
) {
  return db.auditEvent.findMany({ where, orderBy: { occurredAt: "asc" } });
}

export async function reviewTasksFor(db: Db, patientId: string) {
  return db.reviewTask.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } });
}

export async function setRuleParams(db: Db, ruleId: string, params: Record<string, number>) {
  await db.reviewRule.update({ where: { id: ruleId }, data: { params } });
}

export async function sessionRow(db: Db, sessionId: string) {
  return db.exerciseSession.findUniqueOrThrow({ where: { id: sessionId } });
}

export async function setSessionUpdatedAt(db: Db, sessionId: string, at: Date) {
  await db.exerciseSession.update({ where: { id: sessionId }, data: { updatedAt: at } });
}

export async function observationsForCheckIn(db: Db, checkInId: string) {
  return db.observation.findMany({ where: { checkInId } });
}

export async function count(db: Db, table: "user" | "patient" | "intakeAssessment", where: object) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db[table] as any).count({ where });
}

/** Attempts an UPDATE on a published version; the append-only trigger must reject it. */
export async function tryEditVersion(db: Db, versionId: string) {
  return db.carePlanVersion.update({ where: { id: versionId }, data: { title: "edited" } });
}

export async function goalsOfPlan(db: Db, carePlanId: string) {
  return db.goal.findMany({ where: { carePlanId }, orderBy: { createdAt: "asc" } });
}
