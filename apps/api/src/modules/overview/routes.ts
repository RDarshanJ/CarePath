import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { clinicianOverviewSchema, type ClinicianOverview } from "@carepath/shared/contracts";
import { requireCtx } from "../../core/context.js";
import { errorResponses } from "../../core/errors.js";
import { practitionerRef } from "../../core/people.js";
import { addDays, localDate, startOfLocalDay } from "../../core/time.js";
import { findClinic } from "../clinic/repo.js";
import { unreadSummary } from "../messaging/repo.js";
import { totalsBetween } from "../progress/compute.js";
import { scheduleVersions, sessionsSince } from "../progress/repo.js";
import { listTasks } from "../review/repo.js";
import { toReviewTask } from "../review/view.js";
import { caseload, recentPublishes, unreviewedCheckIns, WORK_LIST_LIMIT } from "./repo.js";
import { draftsAwaitingReview } from "../ai/repo.js";

const D = 86_400_000;

export const overviewRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/overview",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "getClinicianOverview",
        tags: ["clinician"],
        summary:
          "Work lists for the signed-in clinician's care-team patients; each count equals its list length.",
        response: { 200: clinicianOverviewSchema, ...errorResponses(401, 403, 429) },
      },
    },
    async (request): Promise<ClinicianOverview> => {
      const ctx = requireCtx(request.ctx);
      const at = now();
      const clinic = await findClinic(db, ctx);
      const tz = clinic.timezone;
      const today = localDate(at, tz);
      const patients = await caseload(db, ctx);
      const ids = patients.map((p) => p.id);

      const tasks = await listTasks(
        db,
        ctx,
        { status: "active", patientIds: ids },
        0,
        WORK_LIST_LIMIT,
      );
      const checkIns = await unreviewedCheckIns(db, ctx, ids);
      const publishes = await recentPublishes(db, ctx, ids, new Date(at.getTime() - 7 * D));

      // Missed activity: the 7 local days before today, same arithmetic as ProgressView.
      const from = addDays(today, -7);
      const to = addDays(today, -1);
      const active = patients.filter((p) => p.status === "active");
      const versions = await scheduleVersions(
        db,
        ctx,
        active.map((p) => p.id),
      );
      const sessions = await sessionsSince(
        db,
        ctx,
        active.map((p) => p.id),
        startOfLocalDay(from, tz),
      );
      const missed = active
        .map((p) => {
          const t = totalsBetween(from, to, tz, versions.get(p.id) ?? [], sessions.get(p.id) ?? []);
          return {
            patient: { id: p.id, givenName: p.givenName, familyName: p.familyName, mrn: p.mrn },
            assignedSessions: t.assignedSessions,
            completedSessions: t.completedSessions,
            missedSessions: Math.max(0, t.assignedSessions - t.completedSessions),
            windowStart: from,
            windowEnd: to,
          };
        })
        .filter((m) => m.missedSessions > 0)
        .sort((a, b) => b.missedSessions - a.missedSessions);

      const aiDrafts = await draftsAwaitingReview(db, ctx, ids, WORK_LIST_LIMIT);

      const list = <T>(items: T[]) => ({ count: items.length, items });
      return {
        generatedAt: at.toISOString(),
        today,
        timezone: tz,
        caseloadSize: patients.length,
        // Every task here belongs to the caller's caseload, so the caller is on each care team.
        openTasks: list(tasks.map((t) => toReviewTask(t, at, true))),
        unreviewedCheckIns: list(
          checkIns.map((c) => ({
            id: c.id,
            patient: c.patient,
            painScore: c.painScore,
            submittedAt: c.submittedAt.toISOString(),
            sessionId: c.sessionId,
          })),
        ),
        missedActivity: list(missed),
        messages: await unreadSummary(db, ctx),
        recentPublishes: list(
          publishes.map((v) => ({
            versionId: v.id,
            patient: v.carePlan.patient,
            versionNumber: v.versionNumber,
            publishedAt: v.publishedAt.toISOString(),
            publishedBy: practitionerRef(v.publishedBy),
          })),
        ),
        // WP 5.2, CR-16.
        aiDraftsAwaitingReview: list(
          aiDrafts.map((g) => ({
            generationId: g.id,
            patient: g.patient,
            kind: g.kind as "progress_summary" | "note_draft",
            reviewState: g._count.reviews > 0 ? ("in_review" as const) : ("unreviewed" as const),
            createdAt: g.createdAt.toISOString(),
            unsupportedStatementCount: g.unsupportedStatementCount,
          })),
        ),
      };
    },
  );
};
