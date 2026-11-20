import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import type { ProgressSession, ScheduleVersion } from "./compute.js";

type Scope = Pick<RequestCtx, "orgId">;

/** Published versions of the patient's active plan, oldest first, with each exercise's schedule. */
export async function scheduleVersions(
  db: DbClient,
  ctx: Scope,
  patientIds: string[],
): Promise<Map<string, ScheduleVersion[]>> {
  const rows = await db.carePlanVersion.findMany({
    where: {
      organizationId: ctx.orgId,
      carePlan: { organizationId: ctx.orgId, patientId: { in: patientIds }, status: "active" },
    },
    orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      versionNumber: true,
      publishedAt: true,
      carePlan: { select: { patientId: true } },
      assignments: { select: { daysOfWeek: true, timesPerDay: true } },
    },
  });
  const out = new Map<string, ScheduleVersion[]>(patientIds.map((id) => [id, []]));
  for (const r of rows) out.get(r.carePlan.patientId)?.push(r);
  return out;
}

/** Sessions started at or after `since`, with activity statuses, oldest first. */
export async function sessionsSince(
  db: DbClient,
  ctx: Scope,
  patientIds: string[],
  since: Date,
): Promise<Map<string, (ProgressSession & ExtraSession)[]>> {
  const rows = await db.exerciseSession.findMany({
    where: { organizationId: ctx.orgId, patientId: { in: patientIds }, startedAt: { gte: since } },
    orderBy: [{ startedAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      patientId: true,
      status: true,
      startedAt: true,
      completedAt: true,
      stoppedAt: true,
      updatedAt: true,
      carePlanVersion: { select: { versionNumber: true } },
      activities: { select: { status: true } },
    },
  });
  const out = new Map<string, (ProgressSession & ExtraSession)[]>(patientIds.map((id) => [id, []]));
  for (const r of rows) out.get(r.patientId)?.push(r);
  return out;
}

interface ExtraSession {
  completedAt: Date | null;
  stoppedAt: Date | null;
  updatedAt: Date;
  carePlanVersion: { versionNumber: number };
}

export async function checkInsSince(db: DbClient, ctx: Scope, patientId: string, since: Date) {
  return db.patientCheckIn.findMany({
    where: { organizationId: ctx.orgId, patientId, submittedAt: { gte: since } },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    select: { id: true, painScore: true, submittedAt: true },
  });
}
