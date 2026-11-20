import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  patientIdParamsSchema,
  progressQuerySchema,
  progressViewSchema,
  type ProgressView,
} from "@carepath/shared/contracts";
import { errorResponses } from "../../core/errors.js";
import { recordPhiRead, requirePatientRead } from "../../core/scope/patient-scope.js";
import { localDate } from "../../core/time.js";
import { openPlanGoals } from "../care-plans/repo.js";
import { findClinic } from "../clinic/repo.js";
import { weeklyProgress, windowStart } from "./compute.js";
import { checkInsSince, scheduleVersions, sessionsSince } from "./repo.js";

/**
 * Weekly progress for patients and clinicians alike (AC-C2): one endpoint, one computation,
 * the same rows.
 */
export const progressRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/patients/:patientId/progress",
    {
      config: { access: { permission: ["careplan.read_own", "clinical.read"] } },
      schema: {
        operationId: "getProgress",
        tags: ["progress"],
        summary: "Weekly assigned versus completed sessions, patient-reported pain and goals.",
        params: patientIdParamsSchema,
        querystring: progressQuerySchema,
        response: { 200: progressViewSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<ProgressView> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const clinic = await findClinic(db, ctx);
      const tz = clinic.timezone;
      const today = localDate(now(), tz);
      const since = windowStart(today, request.query.weeks, tz);
      const versions = (await scheduleVersions(db, ctx, [patientId])).get(patientId) ?? [];
      const sessions = (await sessionsSince(db, ctx, [patientId], since)).get(patientId) ?? [];
      const checkIns = await checkInsSince(db, ctx, patientId, since);
      await recordPhiRead(request, patientId, "Patient", patientId);
      return {
        timezone: tz,
        today,
        weeks: weeklyProgress(today, request.query.weeks, tz, versions, sessions),
        sessions: sessions
          .filter((s) => ["completed", "stopped_discomfort", "abandoned"].includes(s.status))
          .reverse()
          .map((s) => ({
            id: s.id,
            status: s.status as "completed" | "stopped_discomfort" | "abandoned",
            startedAt: s.startedAt.toISOString(),
            endedAt: (s.completedAt ?? s.stoppedAt ?? s.updatedAt).toISOString(),
            versionNumber: s.carePlanVersion.versionNumber,
            completedActivities: s.activities.filter((a) => a.status === "completed").length,
            skippedActivities: s.activities.filter((a) => a.status === "skipped").length,
          })),
        pain: {
          label: "Patient-reported",
          scale: "0 to 10",
          points: checkIns.map((c) => ({
            checkInId: c.id,
            submittedAt: c.submittedAt.toISOString(),
            date: localDate(c.submittedAt, tz),
            painScore: c.painScore,
          })),
        },
        goals: await openPlanGoals(db, ctx, patientId),
      };
    },
  );
};
