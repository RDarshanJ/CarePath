import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

/**
 * Timeline and record history of one patient, built from domain rows (C1 ruling 3.7). A UNION
 * ALL of the source tables, each branch filtered on organization and patient, ordered by time
 * then id, paged in SQL. Details are hydrated afterwards with scoped queries.
 */
type Scope = Pick<RequestCtx, "orgId">;

export interface TimelineKey {
  kind: "plan_version" | "session" | "check_in" | "review_task";
  id: string;
  at: Date;
}

export async function timelineKeys(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  offset: number,
  take: number,
): Promise<TimelineKey[]> {
  return db.$queryRaw<TimelineKey[]>`
    SELECT kind, id, at FROM (
      SELECT 'plan_version' AS kind, v.id, v."publishedAt" AS at
        FROM "CarePlanVersion" v JOIN "CarePlan" p ON p.id = v."carePlanId"
        WHERE v."organizationId" = ${ctx.orgId}::uuid AND p."organizationId" = ${ctx.orgId}::uuid
          AND p."patientId" = ${patientId}::uuid
      UNION ALL
      SELECT 'session', s.id, s."startedAt" FROM "ExerciseSession" s
        WHERE s."organizationId" = ${ctx.orgId}::uuid AND s."patientId" = ${patientId}::uuid
      UNION ALL
      SELECT 'check_in', c.id, c."submittedAt" FROM "PatientCheckIn" c
        WHERE c."organizationId" = ${ctx.orgId}::uuid AND c."patientId" = ${patientId}::uuid
      UNION ALL
      SELECT 'review_task', t.id, t."createdAt" FROM "ReviewTask" t
        WHERE t."organizationId" = ${ctx.orgId}::uuid AND t."patientId" = ${patientId}::uuid
    ) u
    ORDER BY at DESC, id DESC
    OFFSET ${offset} LIMIT ${take}`;
}

export async function timelineDetails(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  keys: TimelineKey[],
) {
  const ids = (kind: TimelineKey["kind"]) => keys.filter((k) => k.kind === kind).map((k) => k.id);
  const org = ctx.orgId;
  const [versions, sessions, checkIns, tasks] = await Promise.all([
    db.carePlanVersion.findMany({
      where: { organizationId: org, id: { in: ids("plan_version") }, carePlan: { patientId } },
      select: {
        id: true,
        versionNumber: true,
        changeNoteForPatient: true,
        publishedBy: {
          select: { id: true, userId: true, givenName: true, familyName: true, credentials: true },
        },
      },
    }),
    db.exerciseSession.findMany({
      where: { organizationId: org, patientId, id: { in: ids("session") } },
      select: {
        id: true,
        status: true,
        completedAt: true,
        stoppedAt: true,
        updatedAt: true,
        carePlanVersion: { select: { versionNumber: true } },
        activities: { select: { status: true } },
      },
    }),
    db.patientCheckIn.findMany({
      where: { organizationId: org, patientId, id: { in: ids("check_in") } },
      select: { id: true, painScore: true, sessionId: true, reviewedAt: true },
    }),
    db.reviewTask.findMany({
      where: { organizationId: org, patientId, id: { in: ids("review_task") } },
      select: { id: true, status: true, explanation: true, rule: { select: { key: true } } },
    }),
  ]);
  return {
    versions: new Map(versions.map((r) => [r.id, r])),
    sessions: new Map(sessions.map((r) => [r.id, r])),
    checkIns: new Map(checkIns.map((r) => [r.id, r])),
    tasks: new Map(tasks.map((r) => [r.id, r])),
  };
}

export interface HistoryRow {
  kind:
    | "intake_submitted"
    | "consent_granted"
    | "consent_revoked"
    | "care_team_member_added"
    | "plan_version_published"
    | "check_in_reviewed"
    | "review_task_resolved"
    | "review_task_dismissed";
  resourceType: string;
  resourceId: string;
  at: Date;
  actorUserId: string | null;
  detail: string;
}

export async function recordHistory(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  offset: number,
  take: number,
): Promise<HistoryRow[]> {
  const org = ctx.orgId;
  return db.$queryRaw<HistoryRow[]>`
    SELECT kind, "resourceType", "resourceId", at, "actorUserId", detail FROM (
      SELECT 'intake_submitted' AS kind, 'IntakeAssessment' AS "resourceType", i.id AS "resourceId",
          i."submittedAt" AS at, pt."userId" AS "actorUserId", 'Intake submitted' AS detail
        FROM "IntakeAssessment" i JOIN "Patient" pt ON pt.id = i."patientId"
        WHERE i."organizationId" = ${org}::uuid AND i."patientId" = ${patientId}::uuid
          AND i."submittedAt" IS NOT NULL
      UNION ALL
      SELECT 'consent_granted', 'Consent', c.id, c."grantedAt", c."capturedByUserId",
          c.type::text || ' granted (text version ' || c."policyVersion" || ')'
        FROM "Consent" c WHERE c."organizationId" = ${org}::uuid AND c."patientId" = ${patientId}::uuid
      UNION ALL
      SELECT 'consent_revoked', 'Consent', c.id, c."revokedAt", NULL, c.type::text || ' revoked'
        FROM "Consent" c WHERE c."organizationId" = ${org}::uuid AND c."patientId" = ${patientId}::uuid
          AND c."revokedAt" IS NOT NULL
      UNION ALL
      SELECT 'care_team_member_added', 'CareTeamMember', m.id, m."startedAt", NULL,
          u."displayName" || ' added as ' || replace(m.role::text, '_', ' ')
        FROM "CareTeamMember" m JOIN "CareTeam" t ON t.id = m."careTeamId"
          JOIN "User" u ON u.id = m."userId"
        WHERE m."organizationId" = ${org}::uuid AND t."organizationId" = ${org}::uuid
          AND t."patientId" = ${patientId}::uuid
      UNION ALL
      SELECT 'plan_version_published', 'CarePlanVersion', v.id, v."publishedAt", pr."userId",
          'Version ' || v."versionNumber" || ' published'
        FROM "CarePlanVersion" v JOIN "CarePlan" p ON p.id = v."carePlanId"
          JOIN "Practitioner" pr ON pr.id = v."publishedByPractitionerId"
        WHERE v."organizationId" = ${org}::uuid AND p."organizationId" = ${org}::uuid
          AND p."patientId" = ${patientId}::uuid
      UNION ALL
      SELECT 'check_in_reviewed', 'PatientCheckIn', c.id, c."reviewedAt", c."reviewedByUserId",
          'Check-in marked reviewed'
        FROM "PatientCheckIn" c WHERE c."organizationId" = ${org}::uuid
          AND c."patientId" = ${patientId}::uuid AND c."reviewedAt" IS NOT NULL
      UNION ALL
      SELECT CASE WHEN t.status = 'dismissed' THEN 'review_task_dismissed' ELSE 'review_task_resolved' END,
          'ReviewTask', t.id, t."resolvedAt", t."resolvedByUserId", r.name
        FROM "ReviewTask" t JOIN "ReviewRule" r ON r.id = t."ruleId"
        WHERE t."organizationId" = ${org}::uuid AND t."patientId" = ${patientId}::uuid
          AND t."resolvedAt" IS NOT NULL
    ) h
    ORDER BY at DESC, "resourceId" DESC, kind
    OFFSET ${offset} LIMIT ${take}`;
}

export async function usersByIds(db: DbClient, ctx: Scope, ids: string[]) {
  const rows = await db.user.findMany({
    where: { id: { in: ids }, memberships: { some: { organizationId: ctx.orgId } } },
    select: { id: true, displayName: true, practitioner: { select: { id: true } } },
  });
  return new Map(rows.map((u) => [u.id, u]));
}
