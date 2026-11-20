import type { Prisma } from "@carepath/db/client";
import { initialStatus } from "@carepath/db";
import { CONSENT_TEXT_VERSIONS, type Consent, type ConsentType } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

type Scope = Pick<RequestCtx, "orgId">;

const consentSelect = {
  id: true,
  type: true,
  status: true,
  policyVersion: true,
  policyUri: true,
  grantedAt: true,
  revokedAt: true,
} as const;

type ConsentRow = Prisma.ConsentGetPayload<{ select: typeof consentSelect }>;

export function toConsent(r: ConsentRow): Consent {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    textVersion: r.policyVersion,
    policyUri: r.policyUri,
    grantedAt: r.grantedAt.toISOString(),
    revokedAt: r.revokedAt?.toISOString() ?? null,
  };
}

export function policyUri(type: ConsentType): string {
  return `/consent/${type.replace(/_/g, "-")}/${CONSENT_TEXT_VERSIONS[type]}`;
}

export async function listConsents(db: DbClient, ctx: Scope, patientId: string) {
  return db.consent.findMany({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: [{ grantedAt: "desc" }, { id: "desc" }],
    select: consentSelect,
  });
}

export async function findActiveConsent(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  type: ConsentType,
) {
  return db.consent.findFirst({
    where: { organizationId: ctx.orgId, patientId, type, status: "active" },
    select: consentSelect,
  });
}

export async function findConsent(db: DbClient, ctx: Scope, patientId: string, consentId: string) {
  return db.consent.findFirst({
    where: { id: consentId, organizationId: ctx.orgId, patientId },
    select: consentSelect,
  });
}

/** A new active row (re-grant inserts, PRD section 9). One active per type by partial index. */
export async function grantConsent(
  db: DbClient,
  ctx: Scope,
  input: { patientId: string; type: ConsentType; userId: string; now: Date },
) {
  return db.consent.create({
    data: {
      organizationId: ctx.orgId,
      patientId: input.patientId,
      type: input.type,
      status: initialStatus.Consent,
      policyVersion: CONSENT_TEXT_VERSIONS[input.type],
      policyUri: policyUri(input.type),
      grantedAt: input.now,
      capturedByUserId: input.userId,
      createdAt: input.now,
      updatedAt: input.now,
    },
    select: consentSelect,
  });
}

/** active -> inactive. Returns false when the consent was not active. */
export async function revokeConsent(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  consentId: string,
  now: Date,
): Promise<boolean> {
  const res = await db.consent.updateMany({
    where: { id: consentId, organizationId: ctx.orgId, patientId, status: "active" },
    data: { status: "inactive", revokedAt: now, updatedAt: now },
  });
  return res.count === 1;
}
