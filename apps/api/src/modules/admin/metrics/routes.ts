import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  metricRowsQuerySchema,
  metricRowsSchema,
  metricsSchema,
  type MetricRows,
  type Metrics,
} from "@carepath/shared/contracts";
import { requireCtx } from "../../../core/context.js";
import { AppError, errorResponses } from "../../../core/errors.js";
import { decodeCursor } from "../../../core/pagination.js";
import { findClinic } from "../../clinic/repo.js";
import { computeAll, computeRows } from "./service.js";

/**
 * CR-13. Six metrics computed from current rows on every request (no snapshots): number,
 * denominator, window, computedAt, previous window where computable, a printed definition, and
 * drill-down lists whose row counts equal the numbers. Counts and administrative names only.
 */
export const metricRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/metrics",
    {
      config: { access: { permission: "metrics.read" } },
      schema: {
        operationId: "getMetrics",
        tags: ["admin"],
        summary:
          "The six administrative metrics with numerator, denominator, window, definition, previous window where computable, and the drill-down lists.",
        response: { 200: metricsSchema, ...errorResponses(401, 403, 429) },
      },
    },
    async (request): Promise<Metrics> => {
      const ctx = requireCtx(request.ctx);
      const clinic = await findClinic(db, ctx);
      const at = now();
      return {
        computedAt: at.toISOString(),
        timezone: clinic.timezone,
        items: await computeAll(db, ctx, at, clinic.timezone),
      };
    },
  );

  app.get(
    "/metrics/rows",
    {
      config: { access: { permission: "metrics.read" } },
      schema: {
        operationId: "listMetricRows",
        tags: ["admin"],
        summary:
          "One drill-down list of a metric, paged. The list's total equals the count the metric states for it.",
        querystring: metricRowsQuerySchema,
        response: { 200: metricRowsSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request): Promise<MetricRows> => {
      const ctx = requireCtx(request.ctx);
      const clinic = await findClinic(db, ctx);
      const rows = await computeRows(
        db,
        ctx,
        request.query.metric,
        request.query.list,
        { offset: decodeCursor(request.query.cursor), limit: request.query.limit },
        now(),
        clinic.timezone,
      );
      if (!rows) {
        throw new AppError("validation_error", [
          {
            path: "querystring.list",
            issue: "unknown_list",
            message: "This metric has no such list.",
          },
        ]);
      }
      return rows;
    },
  );
};
