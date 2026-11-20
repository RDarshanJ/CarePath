import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { canTransition } from "@carepath/db";
import {
  activityIdParamsSchema,
  exerciseSessionDetailSchema,
  patientIdParamsSchema,
  sessionIdParamsSchema,
  sessionActivityUpdateSchema,
  sessionProgressSchema,
  sessionResumeRequestSchema,
  sessionStartRequestSchema,
  sessionStopRequestSchema,
} from "@carepath/shared/contracts";
import type { FastifyRequest } from "fastify";
import type { RequestCtx } from "../../core/context.js";
import type { DbTx } from "../../core/db/repo.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, dbErrorToCode, errorResponses } from "../../core/errors.js";
import {
  requireActivity,
  requireChild,
  requirePatientWrite,
} from "../../core/scope/patient-scope.js";
import { activityInSession } from "../../core/scope/repo.js";
import { localDate, weekday } from "../../core/time.js";
import { findOpenPlan, findVersion } from "../care-plans/repo.js";
import { findClinic } from "../clinic/repo.js";
import {
  activityOrder,
  findActivity,
  findOpenSession,
  findSessionDetail,
  insertSession,
  lockSession,
  touchPatientActivity,
  updateActivity,
  updateSession,
} from "./repo.js";
import { toSessionDetail } from "./view.js";

/**
 * Session writes (delivery step 2). Each action locks the session row, checks the status, writes
 * and returns the stored detail, in one transaction.
 *
 * Status errors: an ended session (completed, abandoned, stopped) answers 409 `session_closed`;
 * an action the current open status does not allow (pause a paused session, complete a paused
 * one) answers 409 `invalid_transition`.
 */
const ENDED = new Set(["completed", "abandoned", "stopped_discomfort"]);
const responses = {
  200: exerciseSessionDetailSchema,
  ...errorResponses(400, 401, 403, 404, 409, 429),
};

async function detail(tx: DbTx, ctx: RequestCtx, patientId: string, sessionId: string) {
  const row = await findSessionDetail(tx, ctx, patientId, sessionId);
  if (!row) throw new Error("session vanished inside its transaction");
  return toSessionDetail(row);
}

/** Locks the session and enforces the allowed current statuses for an action. */
async function lockFor(
  tx: DbTx,
  ctx: RequestCtx,
  patientId: string,
  sessionId: string,
  allowed: readonly string[],
) {
  const locked = await lockSession(tx, ctx, patientId, sessionId);
  if (!locked) throw new AppError("not_found");
  if (ENDED.has(locked.status)) throw new AppError("session_closed");
  if (!allowed.includes(locked.status)) throw new AppError("invalid_transition");
  return locked;
}

/** First pending activity, else the last one: where a resumed session continues (AC-C1). */
async function resumePosition(tx: DbTx, ctx: RequestCtx, sessionId: string): Promise<number> {
  const order = await activityOrder(tx, ctx, sessionId);
  const firstPending = order.findIndex((a) => a.status === "pending");
  return firstPending >= 0 ? firstPending : Math.max(0, order.length - 1);
}

export const sessionWriteRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  async function sessionScope(request: FastifyRequest, patientId: string, sessionId: string) {
    const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
    await requireChild(request, "ExerciseSession", patientId, sessionId);
    return ctx;
  }

  app.post(
    "/patients/:patientId/sessions",
    {
      config: { access: { permission: "session.write_own" } },
      schema: {
        operationId: "startSession",
        tags: ["sessions"],
        summary: "Start a session on the current published version with today's exercises.",
        params: patientIdParamsSchema,
        body: sessionStartRequestSchema,
        response: {
          201: exerciseSessionDetailSchema,
          ...errorResponses(400, 401, 403, 404, 409, 429),
        },
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      const at = now();
      try {
        const body = await withTx(request, async ({ tx }) => {
          if (await findOpenSession(tx, ctx, patientId)) throw new AppError("session_open");
          const plan = await findOpenPlan(tx, ctx, patientId);
          const version = plan?.currentVersionId
            ? await findVersion(tx, ctx, patientId, plan.currentVersionId)
            : null;
          if (!version || version.assignments.length === 0)
            throw new AppError("plan_not_published");
          const clinic = await findClinic(tx, ctx);
          const day = weekday(localDate(at, clinic.timezone));
          const todays = version.assignments.filter((a) => a.daysOfWeek.includes(day));
          // An unscheduled day still allows a session; it then covers the whole plan.
          const chosen = todays.length > 0 ? todays : version.assignments;
          const sessionId = await insertSession(tx, ctx, {
            patientId,
            versionId: version.id,
            assignmentIds: chosen.map((a) => a.id),
            now: at,
          });
          await touchPatientActivity(tx, ctx, patientId, at);
          return detail(tx, ctx, patientId, sessionId);
        });
        return reply.code(201).send(body);
      } catch (err) {
        // Two concurrent starts: the partial unique index on open sessions rejects the second.
        if (dbErrorToCode(err) === "already_exists") throw new AppError("session_open");
        throw err;
      }
    },
  );

  app.post(
    "/patients/:patientId/sessions/:sessionId/pause",
    {
      config: { access: { permission: "session.write_own" } },
      schema: {
        operationId: "pauseSession",
        tags: ["sessions"],
        summary: "Pause with the current position and elapsed time.",
        params: sessionIdParamsSchema,
        body: sessionProgressSchema,
        response: responses,
      },
    },
    async (request) => {
      const { patientId, sessionId } = request.params;
      const ctx = await sessionScope(request, patientId, sessionId);
      return withTx(request, async ({ tx }) => {
        await lockFor(tx, ctx, patientId, sessionId, ["in_progress"]);
        const at = now();
        await updateSession(tx, ctx, patientId, sessionId, {
          status: "paused",
          pausedAt: at,
          currentPosition: request.body.currentPosition,
          elapsedSeconds: request.body.elapsedSeconds,
          updatedAt: at,
        });
        return detail(tx, ctx, patientId, sessionId);
      });
    },
  );

  app.post(
    "/patients/:patientId/sessions/:sessionId/resume",
    {
      config: { access: { permission: "session.write_own" } },
      schema: {
        operationId: "resumeSession",
        tags: ["sessions"],
        summary: "Resume a paused session at its stored position (AC-C1).",
        params: sessionIdParamsSchema,
        body: sessionResumeRequestSchema,
        response: responses,
      },
    },
    async (request) => {
      const { patientId, sessionId } = request.params;
      const ctx = await sessionScope(request, patientId, sessionId);
      return withTx(request, async ({ tx }) => {
        await lockFor(tx, ctx, patientId, sessionId, ["paused"]);
        const at = now();
        await updateSession(tx, ctx, patientId, sessionId, {
          status: "in_progress",
          pausedAt: null,
          updatedAt: at,
        });
        await touchPatientActivity(tx, ctx, patientId, at);
        return detail(tx, ctx, patientId, sessionId);
      });
    },
  );

  app.put(
    "/patients/:patientId/sessions/:sessionId/activities/:activityId",
    {
      config: { access: { permission: "session.write_own" } },
      schema: {
        operationId: "updateSessionActivity",
        tags: ["sessions"],
        summary: "Complete an activity with counts, or skip it with a reason (AC-C3).",
        params: activityIdParamsSchema,
        body: sessionActivityUpdateSchema,
        response: responses,
      },
    },
    async (request) => {
      const { patientId, sessionId, activityId } = request.params;
      const ctx = await sessionScope(request, patientId, sessionId);
      await requireActivity(request, patientId, sessionId, activityId);
      const body = request.body;
      return withTx(request, async ({ tx }) => {
        await lockFor(tx, ctx, patientId, sessionId, ["in_progress"]);
        const activity = await findActivity(tx, ctx, sessionId, activityId);
        if (!activity) throw new AppError("not_found");
        // Completed is final; a skipped activity may be completed later (or skipped again with a
        // new reason). The database enforces the same table (CP001).
        if (
          (activity.status === body.status && body.status !== "skipped") ||
          !canTransition("SessionActivity", activity.status, body.status)
        ) {
          throw new AppError("invalid_transition");
        }
        const at = now();
        const discomfort = {
          discomfortReported: body.discomfortLevel !== null && body.discomfortLevel !== undefined,
          discomfortLevel: body.discomfortLevel ?? null,
          discomfortNote: body.discomfortNote ?? null,
          updatedAt: at,
        };
        await updateActivity(
          tx,
          ctx,
          sessionId,
          activityId,
          body.status === "completed"
            ? {
                status: "completed",
                completedSets: body.completedSets ?? null,
                completedReps: body.completedReps ?? null,
                durationSeconds: body.durationSeconds ?? null,
                skipReason: null,
                completedAt: at,
                ...discomfort,
              }
            : {
                status: "skipped",
                skipReason: body.skipReason,
                completedSets: null,
                completedReps: null,
                durationSeconds: null,
                completedAt: null,
                ...discomfort,
              },
        );
        await updateSession(tx, ctx, patientId, sessionId, {
          currentPosition: await resumePosition(tx, ctx, sessionId),
          updatedAt: at,
        });
        await touchPatientActivity(tx, ctx, patientId, at);
        return detail(tx, ctx, patientId, sessionId);
      });
    },
  );

  app.post(
    "/patients/:patientId/sessions/:sessionId/stop",
    {
      config: { access: { permission: "session.write_own" } },
      schema: {
        operationId: "stopSessionForDiscomfort",
        tags: ["sessions"],
        summary: '"Stop, this hurts": end as stopped_discomfort and request a pain report (AC-C4).',
        params: sessionIdParamsSchema,
        body: sessionStopRequestSchema,
        response: responses,
      },
    },
    async (request) => {
      const { patientId, sessionId } = request.params;
      const ctx = await sessionScope(request, patientId, sessionId);
      const { activityId, discomfortLevel, note } = request.body;
      // A body id, not a path id: an activity of another session is a validation error.
      if (!(await activityInSession(db, ctx, sessionId, activityId))) {
        throw new AppError("validation_error", [
          {
            path: "body.activityId",
            issue: "unknown_activity",
            message: "Not an activity of this session.",
          },
        ]);
      }
      return withTx(request, async ({ tx }) => {
        await lockFor(tx, ctx, patientId, sessionId, ["in_progress", "paused"]);
        const at = now();
        await updateActivity(tx, ctx, sessionId, activityId, {
          discomfortReported: true,
          discomfortLevel,
          discomfortNote: note ?? null,
          updatedAt: at,
        });
        await updateSession(tx, ctx, patientId, sessionId, {
          status: "stopped_discomfort",
          stoppedAt: at,
          updatedAt: at,
        });
        await touchPatientActivity(tx, ctx, patientId, at);
        return detail(tx, ctx, patientId, sessionId);
      });
    },
  );

  app.post(
    "/patients/:patientId/sessions/:sessionId/complete",
    {
      config: { access: { permission: "session.write_own" } },
      schema: {
        operationId: "completeSession",
        tags: ["sessions"],
        summary: "Finish the session. Every activity must be completed or skipped first.",
        params: sessionIdParamsSchema,
        body: sessionProgressSchema,
        response: responses,
      },
    },
    async (request) => {
      const { patientId, sessionId } = request.params;
      const ctx = await sessionScope(request, patientId, sessionId);
      return withTx(request, async ({ tx }) => {
        await lockFor(tx, ctx, patientId, sessionId, ["in_progress"]);
        const order = await activityOrder(tx, ctx, sessionId);
        if (order.some((a) => a.status === "pending")) {
          throw new AppError("invalid_transition", [
            {
              path: "activities",
              issue: "pending_activities",
              message: "Complete or skip every activity before finishing.",
            },
          ]);
        }
        const at = now();
        await updateSession(tx, ctx, patientId, sessionId, {
          status: "completed",
          completedAt: at,
          currentPosition: request.body.currentPosition,
          elapsedSeconds: request.body.elapsedSeconds,
          updatedAt: at,
        });
        await touchPatientActivity(tx, ctx, patientId, at);
        return detail(tx, ctx, patientId, sessionId);
      });
    },
  );
};
