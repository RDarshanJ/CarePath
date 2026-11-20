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

/**
 * The patient-to-care-team thread (WP 4.1 ruling, with WP 4.2 messaging). Run inside the
 * assignment transaction, after the patient row was updated (which holds its lock, so two
 * assignments of one patient cannot both create a thread). Idempotent: the patient's earliest
 * conversation is the care-team thread; it is created when missing, and the patient, the
 * assigned therapist and the active care-team coordinators are added when not yet participants.
 * Earlier therapists stay participants so the history keeps its senders. Returns the thread id.
 */
export async function ensureCareTeamConversation(
  db: DbClient,
  ctx: Scope,
  input: { patientId: string; therapistUserId: string; subject: string; now: Date },
): Promise<string> {
  const patient = await db.patient.findFirst({
    where: { id: input.patientId, organizationId: ctx.orgId },
    select: { userId: true },
  });
  let thread = await db.conversation.findFirst({
    where: { organizationId: ctx.orgId, patientId: input.patientId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  thread ??= await db.conversation.create({
    data: {
      organizationId: ctx.orgId,
      patientId: input.patientId,
      subject: input.subject,
      createdAt: input.now,
      updatedAt: input.now,
    },
    select: { id: true },
  });
  const coordinators = await db.careTeamMember.findMany({
    where: {
      organizationId: ctx.orgId,
      role: "care_coordinator",
      endedAt: null,
      careTeam: { patientId: input.patientId, organizationId: ctx.orgId, status: "active" },
    },
    select: { userId: true },
  });
  const userIds = [
    ...new Set([
      ...(patient?.userId ? [patient.userId] : []),
      input.therapistUserId,
      ...coordinators.map((c) => c.userId),
    ]),
  ];
  await db.conversationParticipant.createMany({
    data: userIds.map((userId) => ({
      organizationId: ctx.orgId,
      conversationId: thread.id,
      userId,
      joinedAt: input.now,
    })),
    skipDuplicates: true,
  });
  return thread.id;
}
