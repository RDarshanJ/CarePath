import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { auditRoutes } from "./audit/routes.js";
import { availabilityRoutes } from "./availability/routes.js";
import { enrollmentCodeRoutes } from "./enrollment-codes/routes.js";
import { metricRoutes } from "./metrics/routes.js";

/**
 * WP 6.1 administration: metrics (CR-13), availability writes (CR-14), audit query (CR-15) and
 * eligibility codes. Review rules are served by modules/review (GET and PUT /review-rules).
 */
export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(metricRoutes);
  await app.register(availabilityRoutes);
  await app.register(auditRoutes);
  await app.register(enrollmentCodeRoutes);
};
