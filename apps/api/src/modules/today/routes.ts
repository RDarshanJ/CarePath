import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  patientIdParamsSchema,
  todayViewSchema,
  type TodaySessionState,
  type TodayView,
} from "@carepath/shared/contracts";
import { errorResponses } from "../../core/errors.js";
import { practitionerRef } from "../../core/people.js";
import { requirePatientRead } from "../../core/scope/patient-scope.js";
import { localDate, startOfLocalDay, weekday } from "../../core/time.js";
import { findOpenPlan, findUnreadPlanNotice, findVersion } from "../care-plans/repo.js";
import { latestCheckIn } from "../check-ins/repo.js";
import { findClinic } from "../clinic/repo.js";
import { assignedOn, weeklyProgress, windowStart } from "../progress/compute.js";
import { scheduleVersions, sessionsSince } from "../progress/repo.js";
import { unreadSummary } from "../messaging/repo.js";
import { findLastEndedSession, findOpenSession } from "../sessions/repo.js";
import { findPatientBasics } from "./repo.js";

/**
 * Patient Today (REQ-TOD-01, REQ-TOD-02). "Today" is the organization's local date at the API's
 * clock (CAREPATH_FIXED_NOW in gates), never the browser's.
 */
export const todayRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/patients/:patientId/today",
    {
      config: { access: { permission: "careplan.read_own" } },
      schema: {
        operationId: "getToday",
        tags: ["today"],
        summary:
          "Today's session state, check-in due, unacknowledged plan change and this week's progress.",
        params: patientIdParamsSchema,
        response: { 200: todayViewSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<TodayView> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const at = now();
      const clinic = await findClinic(db, ctx);
      const tz = clinic.timezone;
      const today = localDate(at, tz);
      const midnight = startOfLocalDay(today, tz);
      const patient = await findPatientBasics(db, ctx, patientId);

      const plan = await findOpenPlan(db, ctx, patientId);
      const version = plan?.currentVersionId
        ? await findVersion(db, ctx, patientId, plan.currentVersionId)
        : null;
      const versions = (await scheduleVersions(db, ctx, [patientId])).get(patientId) ?? [];
      const sessions =
        (await sessionsSince(db, ctx, [patientId], windowStart(today, 1, tz))).get(patientId) ?? [];
      const scheduledToday = version !== null && assignedOn(today, tz, versions) > 0;

      const open = await findOpenSession(db, ctx, patientId);
      const ended = await findLastEndedSession(db, ctx, patientId, midnight);
      let state: TodaySessionState;
      if (open) state = open.status === "paused" ? "paused" : "in_progress";
      else if (ended) state = "done";
      else state = scheduledToday ? "due" : "not_scheduled";

      const last = await latestCheckIn(db, ctx, patientId);
      const pendingSession = ended && ended.checkIns.length === 0 ? ended.id : null;
      const checkedInToday = last !== null && last.submittedAt >= midnight;

      const showChange =
        version !== null &&
        patient.userId !== null &&
        (await findUnreadPlanNotice(db, ctx, patient.userId, version.id));

      const day = weekday(today);
      return {
        date: today,
        timezone: tz,
        patient: { id: patient.id, givenName: patient.givenName, status: patient.status },
        plan:
          plan && version
            ? {
                carePlanId: plan.id,
                title: version.title,
                versionId: version.id,
                versionNumber: version.versionNumber,
                publishedAt: version.publishedAt.toISOString(),
                exerciseCount: version.assignments.length,
                exercisesToday: version.assignments.filter((a) => a.daysOfWeek.includes(day))
                  .length,
              }
            : null,
        session: {
          state,
          openSessionId: open?.id ?? null,
          lastSessionId: !open && ended ? ended.id : null,
        },
        checkIn: {
          due: pendingSession !== null || (scheduledToday && !checkedInToday),
          sessionId: pendingSession,
          lastSubmittedAt: last?.submittedAt.toISOString() ?? null,
        },
        planChange:
          showChange && version
            ? {
                versionId: version.id,
                versionNumber: version.versionNumber,
                changeNoteForPatient: version.changeNoteForPatient,
                publishedAt: version.publishedAt.toISOString(),
                publishedBy: practitionerRef(version.publishedBy),
              }
            : null,
        week: weeklyProgress(today, 1, tz, versions, sessions)[0]!,
        messages: await unreadSummary(db, ctx),
      };
    },
  );
};
