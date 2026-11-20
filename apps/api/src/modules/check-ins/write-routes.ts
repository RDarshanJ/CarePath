import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { EMERGENCY_NOTICE, painNoticeMessage } from "@carepath/shared";
import {
  checkInCreateSchema,
  checkInResultSchema,
  patientIdParamsSchema,
  type CheckInResult,
} from "@carepath/shared/contracts";
import { withTx } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { requirePatientWrite } from "../../core/scope/patient-scope.js";
import { localDate } from "../../core/time.js";
import { findClinic } from "../clinic/repo.js";
import { evaluatePainRule } from "../review/pain.js";
import { lockSession, touchPatientActivity } from "../sessions/repo.js";
import { findCheckIn, insertCheckIn, sessionHasCheckIn } from "./repo.js";

/**
 * Check-in creation (delivery step 2). The check-in, its pain Observation and the pain rule's
 * task commit together or not at all.
 */
export const checkInWriteRoutes: FastifyPluginAsyncZod = async (app) => {
  const { now } = app.deps;

  app.post(
    "/patients/:patientId/check-ins",
    {
      config: { access: { permission: "checkin.write_own" } },
      schema: {
        operationId: "createCheckIn",
        tags: ["check-ins"],
        summary:
          "Submit a check-in. Pain at the clinic threshold returns the contact notice and raises one review task.",
        params: patientIdParamsSchema,
        body: checkInCreateSchema,
        response: { 201: checkInResultSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      const { sessionId, painScore, difficulty, notes } = request.body;
      const result = await withTx(request, async ({ tx }): Promise<CheckInResult> => {
        const at = now();
        const clinic = await findClinic(tx, ctx);
        if (sessionId) {
          // A body id: a session of another patient is a validation error, like an unknown one.
          const session = await lockSession(tx, ctx, patientId, sessionId);
          if (!session) {
            throw new AppError("validation_error", [
              {
                path: "body.sessionId",
                issue: "unknown_session",
                message: "Not one of your sessions.",
              },
            ]);
          }
          if (localDate(session.startedAt, clinic.timezone) < localDate(at, clinic.timezone)) {
            throw new AppError("session_closed");
          }
          if (await sessionHasCheckIn(tx, ctx, patientId, sessionId)) {
            throw new AppError("already_exists");
          }
        }
        const id = await insertCheckIn(tx, ctx, {
          patientId,
          sessionId: sessionId ?? null,
          painScore,
          difficulty: difficulty ?? null,
          notes: notes ?? null,
          now: at,
        });
        const rule = await evaluatePainRule(tx, ctx, {
          patientId,
          checkInId: id,
          painScore,
          now: at,
        });
        await touchPatientActivity(tx, ctx, patientId, at);
        const checkIn = await findCheckIn(tx, ctx, patientId, id);
        if (!checkIn) throw new Error("check-in vanished inside its transaction");
        return {
          checkIn,
          seenBy: "care_team",
          painNotice: rule.atOrAbove
            ? {
                painScore,
                threshold: rule.threshold,
                clinicPhone: clinic.phone,
                message: painNoticeMessage(painScore, clinic.phone),
                emergencyNotice: EMERGENCY_NOTICE,
              }
            : null,
        };
      });
      return reply.code(201).send(result);
    },
  );
};
