import type { Prisma } from "@carepath/db/client";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

type Scope = Pick<RequestCtx, "orgId">;

const intakeSelect = {
  id: true,
  status: true,
  currentStep: true,
  answers: true,
  startedAt: true,
  updatedAt: true,
  submittedAt: true,
} as const;

/** The patient's latest intake. */
export async function findIntake(db: DbClient, ctx: Scope, patientId: string) {
  return db.intakeAssessment.findFirst({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    select: intakeSelect,
  });
}

/** Locks the intake row for the rest of the transaction. */
export async function lockIntake(db: DbClient, ctx: Scope, patientId: string) {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "IntakeAssessment"
    WHERE "organizationId" = ${ctx.orgId}::uuid AND "patientId" = ${patientId}::uuid
    ORDER BY "startedAt" DESC, id DESC LIMIT 1
    FOR UPDATE`;
  return rows[0] ? findIntake(db, ctx, patientId) : null;
}

export async function saveIntakeStep(
  db: DbClient,
  ctx: Scope,
  intakeId: string,
  data: {
    currentStep: string;
    answers: Prisma.InputJsonValue;
    reasonForCare?: string | null;
    bodyArea?: string | null;
    painScore?: number | null;
    now: Date;
  },
): Promise<void> {
  const { now, ...rest } = data;
  const res = await db.intakeAssessment.updateMany({
    where: { id: intakeId, organizationId: ctx.orgId, status: "in_progress" },
    data: { ...rest, updatedAt: now },
  });
  if (res.count !== 1) throw new Error("intake update matched no row in scope");
}

export async function submitIntake(db: DbClient, ctx: Scope, intakeId: string, now: Date) {
  const res = await db.intakeAssessment.updateMany({
    where: { id: intakeId, organizationId: ctx.orgId, status: "in_progress" },
    data: { status: "submitted", submittedAt: now, currentStep: "review", updatedAt: now },
  });
  if (res.count !== 1) throw new Error("intake update matched no row in scope");
}

/** The patient's own demographic fields from the personal-information step (patient.update_own). */
export async function updatePatientDemographics(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  data: {
    givenName: string;
    familyName: string;
    birthDate: string;
    phone: string | null;
    preferredLanguage: string;
    now: Date;
  },
): Promise<void> {
  await db.patient.updateMany({
    where: { id: patientId, organizationId: ctx.orgId },
    data: {
      givenName: data.givenName,
      familyName: data.familyName,
      birthDate: new Date(`${data.birthDate}T00:00:00Z`),
      phone: data.phone,
      preferredLanguage: data.preferredLanguage,
      updatedAt: data.now,
    },
  });
}

/** Patient status change; the status trigger rejects anything outside the transition table. */
export async function setPatientStatus(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  from: "intake_incomplete" | "awaiting_assignment",
  to: "awaiting_assignment" | "active",
  now: Date,
): Promise<boolean> {
  const res = await db.patient.updateMany({
    where: { id: patientId, organizationId: ctx.orgId, status: from },
    data: { status: to, updatedAt: now },
  });
  return res.count === 1;
}
