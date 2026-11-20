import type { Prisma } from "@carepath/db/client";
import { initialStatus } from "@carepath/db";
import type { CheckIn } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { userRef } from "../../core/people.js";

/** Check-ins and their pain Observations. Keyed by (organization, patient). */
type Scope = Pick<RequestCtx, "orgId">;

const checkInSelect = {
  id: true,
  sessionId: true,
  painScore: true,
  difficulty: true,
  notes: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: {
    select: {
      user: { select: { id: true, displayName: true, practitioner: { select: { id: true } } } },
    },
  },
} as const;

type CheckInRow = Prisma.PatientCheckInGetPayload<{ select: typeof checkInSelect }>;

export function toCheckIn(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    sessionId: row.sessionId,
    painScore: row.painScore,
    difficulty: row.difficulty,
    notes: row.notes,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedBy: userRef(row.reviewedBy?.user ?? null),
  };
}

export async function findCheckIn(db: DbClient, ctx: Scope, patientId: string, checkInId: string) {
  const row = await db.patientCheckIn.findFirst({
    where: { id: checkInId, organizationId: ctx.orgId, patientId },
    select: checkInSelect,
  });
  return row ? toCheckIn(row) : null;
}

/** Newest first. */
export async function listCheckIns(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  offset: number,
  take: number,
): Promise<CheckIn[]> {
  const rows = await db.patientCheckIn.findMany({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    skip: offset,
    take,
    select: checkInSelect,
  });
  return rows.map(toCheckIn);
}

export async function latestCheckIn(db: DbClient, ctx: Scope, patientId: string) {
  return db.patientCheckIn.findFirst({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    select: { id: true, submittedAt: true },
  });
}

/** True when a check-in already references the session. */
export async function sessionHasCheckIn(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  sessionId: string,
): Promise<boolean> {
  const row = await db.patientCheckIn.findFirst({
    where: { organizationId: ctx.orgId, patientId, sessionId },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Inserts the check-in and its pain Observation (REQ-CHK-04: LOINC 72514-3, performer Patient,
 * status from initialStatus).
 */
export async function insertCheckIn(
  db: DbClient,
  ctx: Scope,
  input: {
    patientId: string;
    sessionId: string | null;
    painScore: number;
    difficulty: CheckIn["difficulty"];
    notes: string | null;
    now: Date;
  },
): Promise<string> {
  const row = await db.patientCheckIn.create({
    data: {
      organizationId: ctx.orgId,
      patientId: input.patientId,
      sessionId: input.sessionId,
      painScore: input.painScore,
      difficulty: input.difficulty,
      notes: input.notes,
      submittedAt: input.now,
    },
    select: { id: true },
  });
  await db.observation.create({
    data: {
      organizationId: ctx.orgId,
      patientId: input.patientId,
      checkInId: row.id,
      sessionId: input.sessionId,
      status: initialStatus.Observation,
      category: "survey",
      codeSystem: "http://loinc.org",
      code: "72514-3",
      display: "Pain severity - 0-10 verbal numeric rating [Score] - Reported",
      valueQuantity: input.painScore,
      valueUnit: "{score}",
      performerType: "patient",
      effectiveAt: input.now,
      recordedAt: input.now,
    },
  });
  return row.id;
}

/** Marks the check-in reviewed unless it already is. Returns false when it was. */
export async function markReviewed(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  checkInId: string,
  reviewerUserId: string,
  at: Date,
): Promise<boolean> {
  const res = await db.patientCheckIn.updateMany({
    where: { id: checkInId, organizationId: ctx.orgId, patientId, reviewedAt: null },
    data: { reviewedAt: at, reviewedByUserId: reviewerUserId },
  });
  return res.count === 1;
}
