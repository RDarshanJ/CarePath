import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  cursorQuerySchema,
  patientIdParamsSchema,
  recordHistoryPageSchema,
  timelinePageSchema,
  type ExerciseSessionStatus,
  type RecordHistoryPage,
  type ReviewRuleKey,
  type TimelineItem,
  type TimelinePage,
} from "@carepath/shared/contracts";
import { errorResponses } from "../../core/errors.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import { practitionerRef, userRef } from "../../core/people.js";
import { recordPhiRead, requirePatientRead } from "../../core/scope/patient-scope.js";
import { recordHistory, timelineDetails, timelineKeys, usersByIds } from "./repo.js";

/** Clinician record sections: timeline and record history (delivery step 3). */
export const recordRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db } = app.deps;

  app.get(
    "/patients/:patientId/timeline",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "getTimeline",
        tags: ["clinician"],
        summary:
          "Plan versions, sessions, check-ins and review tasks of one patient, newest first.",
        params: patientIdParamsSchema,
        querystring: cursorQuerySchema,
        response: { 200: timelinePageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<TimelinePage> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const offset = decodeCursor(request.query.cursor);
      const keys = await timelineKeys(db, ctx, patientId, offset, request.query.limit + 1);
      const page = pageFrom(keys, offset, request.query.limit);
      const d = await timelineDetails(db, ctx, patientId, page.items);
      const items: TimelineItem[] = page.items.map((k) => {
        const at = k.at.toISOString();
        switch (k.kind) {
          case "plan_version": {
            const v = d.versions.get(k.id)!;
            return {
              kind: k.kind,
              at,
              id: k.id,
              versionNumber: v.versionNumber,
              publishedBy: practitionerRef(v.publishedBy),
              changeNoteForPatient: v.changeNoteForPatient,
            };
          }
          case "session": {
            const s = d.sessions.get(k.id)!;
            const n = (st: string) => s.activities.filter((a) => a.status === st).length;
            const ended =
              s.completedAt ?? s.stoppedAt ?? (s.status === "abandoned" ? s.updatedAt : null);
            return {
              kind: k.kind,
              at,
              id: k.id,
              status: s.status as ExerciseSessionStatus,
              versionNumber: s.carePlanVersion.versionNumber,
              endedAt: ended?.toISOString() ?? null,
              completedActivities: n("completed"),
              skippedActivities: n("skipped"),
              totalActivities: s.activities.length,
              stoppedForDiscomfort: s.status === "stopped_discomfort",
            };
          }
          case "check_in": {
            const c = d.checkIns.get(k.id)!;
            return {
              kind: k.kind,
              at,
              id: k.id,
              painScore: c.painScore,
              sessionId: c.sessionId,
              reviewedAt: c.reviewedAt?.toISOString() ?? null,
            };
          }
          case "review_task": {
            const t = d.tasks.get(k.id)!;
            return {
              kind: k.kind,
              at,
              id: k.id,
              ruleKey: t.rule.key as ReviewRuleKey,
              status: t.status,
              explanation: t.explanation,
            };
          }
        }
      });
      await recordPhiRead(request, patientId, "Patient", patientId);
      return { items, nextCursor: page.nextCursor };
    },
  );

  app.get(
    "/patients/:patientId/record-history",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "getRecordHistory",
        tags: ["clinician"],
        summary:
          "Who changed what in the record, from domain rows (not the audit log), newest first.",
        params: patientIdParamsSchema,
        querystring: cursorQuerySchema,
        response: { 200: recordHistoryPageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<RecordHistoryPage> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const offset = decodeCursor(request.query.cursor);
      const rows = await recordHistory(db, ctx, patientId, offset, request.query.limit + 1);
      const page = pageFrom(rows, offset, request.query.limit);
      const users = await usersByIds(
        db,
        ctx,
        page.items.map((r) => r.actorUserId).filter((x): x is string => x !== null),
      );
      return {
        nextCursor: page.nextCursor,
        items: page.items.map((r) => ({
          kind: r.kind,
          at: r.at.toISOString(),
          resourceType: r.resourceType,
          resourceId: r.resourceId,
          actor: r.actorUserId ? userRef(users.get(r.actorUserId) ?? null) : null,
          detail: r.detail,
        })),
      };
    },
  );
};
