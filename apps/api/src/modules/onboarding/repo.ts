import { randomBytes } from "node:crypto";
import { initialStatus } from "@carepath/db";
import type { DbClient } from "../../core/db/repo.js";

/**
 * Account creation (Scenario A). Public: there is no request context, so the organization comes
 * from the eligibility code, and every write below names it explicitly.
 */

/** An unredeemed, unexpired code by hash. Expired and used codes look exactly like unknown ones. */
export async function findUsableCode(db: DbClient, codeHash: string, now: Date) {
  return db.enrollmentCode.findFirst({
    where: { codeHash, redeemedAt: null, expiresAt: { gt: now } },
    select: {
      id: true,
      organizationId: true,
      organization: { select: { timezone: true, active: true } },
    },
  });
}

/** Redeems the code for the patient, only if still unredeemed and unexpired (race-safe). */
export async function redeemCode(
  db: DbClient,
  input: { codeId: string; orgId: string; patientId: string; now: Date },
): Promise<boolean> {
  const res = await db.enrollmentCode.updateMany({
    where: {
      id: input.codeId,
      organizationId: input.orgId,
      redeemedAt: null,
      expiresAt: { gt: input.now },
    },
    data: { redeemedAt: input.now, redeemedByPatientId: input.patientId },
  });
  return res.count === 1;
}

export async function emailTaken(db: DbClient, email: string): Promise<boolean> {
  return (await db.user.findUnique({ where: { email }, select: { id: true } })) !== null;
}

/** User, patient membership, patient (initial status) and intake (initial status, step 3 prefilled). */
export async function createPatientAccount(
  db: DbClient,
  input: {
    orgId: string;
    timezone: string;
    email: string;
    passwordHash: string;
    givenName: string;
    familyName: string;
    birthDate: string;
    now: Date;
  },
): Promise<{ userId: string; patientId: string }> {
  const role = await db.role.findUniqueOrThrow({ where: { key: "patient" }, select: { id: true } });
  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: `${input.givenName} ${input.familyName}`,
      createdAt: input.now,
      updatedAt: input.now,
    },
    select: { id: true },
  });
  await db.organizationMembership.create({
    data: {
      organizationId: input.orgId,
      userId: user.id,
      roleId: role.id,
      status: initialStatus.OrganizationMembership,
      startedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now,
    },
  });
  const patient = await db.patient.create({
    data: {
      organizationId: input.orgId,
      userId: user.id,
      mrn: `CP-${randomBytes(5).toString("hex").toUpperCase()}`,
      givenName: input.givenName,
      familyName: input.familyName,
      birthDate: new Date(`${input.birthDate}T00:00:00Z`),
      email: input.email,
      timezone: input.timezone,
      status: initialStatus.Patient,
      createdAt: input.now,
      updatedAt: input.now,
    },
    select: { id: true },
  });
  await db.intakeAssessment.create({
    data: {
      organizationId: input.orgId,
      patientId: patient.id,
      status: initialStatus.IntakeAssessment,
      currentStep: "personal_information",
      // The account step already asked these; the intake shows them prefilled (WCAG 3.3.7).
      answers: {
        personal_information: {
          givenName: input.givenName,
          familyName: input.familyName,
          birthDate: input.birthDate,
          phone: null,
          preferredLanguage: "en",
        },
      },
      startedAt: input.now,
      updatedAt: input.now,
    },
  });
  return { userId: user.id, patientId: patient.id };
}
