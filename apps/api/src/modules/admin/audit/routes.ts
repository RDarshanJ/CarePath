import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { auditPageSchema, auditQuerySchema, type AuditPage } from "@carepath/shared/contracts";
import { requireCtx } from "../../../core/context.js";
import { errorResponses } from "../../../core/errors.js";
import { decodeAuditCursor, encodeAuditCursor, listAuditEvents } from "./repo.js";

/**
 * CR-15. Audit query for the clinic administrator (`audit.read`; the coordinator is refused,
 * AC-H5). Reading the log is itself audited: `audit.query` is written after the page is built,
 * so a request never lists itself. The event keeps which filters were used (names only, plus
 * ids) and how many rows came back, never the rows.
 */
export const auditRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, audit } = app.deps;

  app.get(
    "/audit-events",
    {
      config: { access: { permission: "audit.read" } },
      schema: {
        operationId: "listAuditEvents",
        tags: ["admin"],
        summary:
          "Audit events of the organization, newest first, filtered by actor, event, resource, patient, date range and outcome, with cursor paging. The read is itself audited.",
        querystring: auditQuerySchema,
        response: { 200: auditPageSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request): Promise<AuditPage> => {
      const ctx = requireCtx(request.ctx);
      const q = request.query;
      const { items, next } = await listAuditEvents(db, ctx, q, decodeAuditCursor(q.cursor));
      const used: Record<string, string | number | boolean> = { rows: items.length };
      for (const key of [
        "actorUserId",
        "eventName",
        "action",
        "resourceType",
        "resourceId",
        "patientId",
        "from",
        "to",
        "outcome",
      ] as const) {
        if (q[key] !== undefined) used[`filter.${key}`] = q[key];
      }
      if (q.cursor) used["paged"] = true;
      await audit.fromRequest(request, {
        eventName: "audit.query",
        action: "R",
        outcome: "success",
        resourceType: "AuditEvent",
        purposeOfUse: "admin",
        metadata: used,
      });
      return { items, nextCursor: next ? encodeAuditCursor(next) : null };
    },
  );
};
