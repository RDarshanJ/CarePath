import type { Prisma } from "@carepath/db/client";
import type { EnrollmentCode, EnrollmentCodeStatus } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../../core/context.js";
import type { DbClient, DbTx } from "../../../core/db/repo.js";

/** Eligibility codes (WP 6.1). Only a hash of the code is stored; no function here can return one. */
type Scope = Pick<RequestCtx, "orgId">;

const select = {
  id: true,
  label: true,
  createdAt: true,
  expiresAt: true,
  redeemedAt: true,
  revokedAt: true,
  redeemedBy: { select: { id: true, givenName: true, familyName: true } },
} as const;

type Row = Prisma.EnrollmentCodeGetPayload<{ select: typeof select }>;

export function statusOf(
  row: Pick<Row, "redeemedAt" | "revokedAt" | "expiresAt">,
  now: Date,
): EnrollmentCodeStatus {
  if (row.revokedAt) return "revoked";
  if (row.redeemedAt) return "redeemed";
  return row.expiresAt <= now ? "expired" : "unused";
}

export function toCode(row: Row, now: Date): EnrollmentCode {
  return {
    id: row.id,
    label: row.label,
    status: statusOf(row, now),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
    redeemedBy: row.redeemedBy
      ? { id: row.redeemedBy.id, name: `${row.redeemedBy.givenName} ${row.redeemedBy.familyName}` }
      : null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

function statusWhere(status: EnrollmentCodeStatus, now: Date): Prisma.EnrollmentCodeWhereInput {
  switch (status) {
    case "revoked":
      return { revokedAt: { not: null } };
    case "redeemed":
      return { revokedAt: null, redeemedAt: { not: null } };
    case "expired":
      return { revokedAt: null, redeemedAt: null, expiresAt: { lte: now } };
    case "unused":
      return { revokedAt: null, redeemedAt: null, expiresAt: { gt: now } };
  }
}

export async function listCodes(
  db: DbClient,
  scope: Scope,
  input: { status?: EnrollmentCodeStatus; offset: number; take: number; now: Date },
): Promise<EnrollmentCode[]> {
  const rows = await db.enrollmentCode.findMany({
    where: {
      organizationId: scope.orgId,
      ...(input.status ? statusWhere(input.status, input.now) : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: input.offset,
    take: input.take,
    select,
  });
  return rows.map((r) => toCode(r, input.now));
}

export async function findCode(
  db: DbClient,
  scope: Scope,
  codeId: string,
  now: Date,
): Promise<EnrollmentCode | null> {
  const row = await db.enrollmentCode.findFirst({
    where: { id: codeId, organizationId: scope.orgId },
    select,
  });
  return row ? toCode(row, now) : null;
}

/** Inserts a code by hash. Returns null when the hash already exists (the caller draws again). */
export async function insertCode(
  tx: DbTx,
  scope: Scope,
  input: { codeHash: string; label: string; expiresAt: Date; now: Date },
): Promise<string | null> {
  const taken = await tx.enrollmentCode.findUnique({
    where: { codeHash: input.codeHash },
    select: { id: true },
  });
  if (taken) return null;
  const row = await tx.enrollmentCode.create({
    data: {
      organizationId: scope.orgId,
      codeHash: input.codeHash,
      label: input.label,
      expiresAt: input.expiresAt,
      createdAt: input.now,
    },
    select: { id: true },
  });
  return row.id;
}

/** Revokes an unredeemed, unrevoked, unexpired code. False when it is in any other state. */
export async function revokeCode(
  tx: DbTx,
  scope: Scope,
  codeId: string,
  now: Date,
): Promise<boolean> {
  const res = await tx.enrollmentCode.updateMany({
    where: {
      id: codeId,
      organizationId: scope.orgId,
      redeemedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: { revokedAt: now },
  });
  return res.count === 1;
}
