import { initialStatus } from "@carepath/db";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

type Scope = Pick<RequestCtx, "orgId">;

export async function careTeamMembers(db: DbClient, ctx: Scope, patientId: string) {
  return db.careTeamMember.findMany({
    where: {
      organizationId: ctx.orgId,
      endedAt: null,
      careTeam: { patientId, organizationId: ctx.orgId, status: "active" },
    },
    orderBy: [{ startedAt: "asc" }, { id: "asc" }],
    select: {
      userId: true,
      role: true,
      startedAt: true,
      membership: {
        select: {
          user: { select: { displayName: true } },
          practitioner: {
            select: {
              id: true,
              userId: true,
              givenName: true,
              familyName: true,
              credentials: true,
            },
          },
        },
      },
    },
  });
}

/** Active practitioners with the number of active patients whose care team includes them. */
export async function practitionersWithCaseload(db: DbClient, ctx: Scope) {
  const rows = await db.practitioner.findMany({
    where: { organizationId: ctx.orgId, active: true },
    orderBy: [{ familyName: "asc" }, { givenName: "asc" }, { id: "asc" }],
    select: { id: true, userId: true, givenName: true, familyName: true, credentials: true },
  });
  const counts = await db.careTeamMember.groupBy({
    by: ["userId"],
    where: {
      organizationId: ctx.orgId,
      endedAt: null,
      careTeam: { status: "active", patient: { status: "active" } },
    },
    _count: { _all: true },
  });
  const byUser = new Map(counts.map((c) => [c.userId, c._count._all]));
  return rows.map((p) => ({ ...p, activeCaseload: p.userId ? (byUser.get(p.userId) ?? 0) : 0 }));
}

export async function assignablePractitioner(db: DbClient, ctx: Scope, practitionerId: string) {
  return db.practitioner.findFirst({
    where: {
      id: practitionerId,
      organizationId: ctx.orgId,
      active: true,
      userId: { not: null },
      membership: { status: "active" },
    },
    select: { id: true, userId: true },
  });
}

/**
 * Adds the practitioner as primary therapist, creating or reactivating the team. A previous
 * primary therapist is ended first (one active primary by partial index).
 */
export async function addPrimaryTherapist(
  db: DbClient,
  ctx: Scope,
  input: { patientId: string; userId: string; now: Date },
): Promise<string> {
  let team = await db.careTeam.findFirst({
    where: { organizationId: ctx.orgId, patientId: input.patientId },
    select: { id: true, status: true },
  });
  if (!team) {
    team = await db.careTeam.create({
      data: {
        organizationId: ctx.orgId,
        patientId: input.patientId,
        name: "Care team",
        status: initialStatus.CareTeam,
        createdAt: input.now,
        updatedAt: input.now,
      },
      select: { id: true, status: true },
    });
  } else if (team.status !== "active") {
    await db.careTeam.updateMany({
      where: { id: team.id, organizationId: ctx.orgId },
      data: { status: "active", updatedAt: input.now },
    });
  }
  await db.careTeamMember.updateMany({
    where: {
      organizationId: ctx.orgId,
      careTeamId: team.id,
      endedAt: null,
      OR: [{ role: "primary_therapist" }, { userId: input.userId }],
    },
    data: { endedAt: input.now },
  });
  const member = await db.careTeamMember.create({
    data: {
      organizationId: ctx.orgId,
      careTeamId: team.id,
      userId: input.userId,
      role: "primary_therapist",
      startedAt: input.now,
    },
    select: { id: true },
  });
  return member.id;
}
