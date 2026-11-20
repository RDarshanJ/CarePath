import { randomUUID } from "node:crypto";
import Fastify, { LogController, type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { loadConfig, type AppConfig } from "./config.js";
import { AuditWriter } from "./core/audit/audit.js";
import { registerAccessHooks } from "./core/auth/access.js";
import { authRoutes } from "./core/auth/routes.js";
import { roleRoutes } from "./core/authz/routes.js";
import type { AppDeps } from "./core/context.js";
import { createDb, type Db } from "./core/db/repo.js";
import { registerErrorHandling } from "./core/errors.js";
import { healthRoutes } from "./core/health/routes.js";
import { registerHttp } from "./core/http.js";
import { loggerOptions, registerRequestLogging } from "./core/logging.js";
import { registerOpenApi, registerOpenApiRoute } from "./core/openapi.js";
import { carePlanDraftRoutes } from "./modules/care-plans/draft-routes.js";
import { carePlanRoutes } from "./modules/care-plans/routes.js";
import { careTeamRoutes } from "./modules/care-team/routes.js";
import { consentRoutes } from "./modules/consents/routes.js";
import { intakeRoutes } from "./modules/intake/routes.js";
import { onboardingRoutes } from "./modules/onboarding/routes.js";
import { checkInRoutes } from "./modules/check-ins/routes.js";
import { checkInWriteRoutes } from "./modules/check-ins/write-routes.js";
import { clinicRoutes } from "./modules/clinic/routes.js";
import { exerciseRoutes } from "./modules/exercises/routes.js";
import { overviewRoutes } from "./modules/overview/routes.js";
import { recordRoutes } from "./modules/records/routes.js";
import { reviewActionRoutes } from "./modules/review/action-routes.js";
import { reviewRoutes } from "./modules/review/routes.js";
import { patientRoutes } from "./modules/patients/routes.js";
import { progressRoutes } from "./modules/progress/routes.js";
import { sessionRoutes } from "./modules/sessions/routes.js";
import { sessionWriteRoutes } from "./modules/sessions/write-routes.js";
import { todayRoutes } from "./modules/today/routes.js";

export interface BuildAppOptions {
  config?: Partial<AppConfig>;
  /** Shared client (tests); when omitted the app creates one and closes it on shutdown. */
  db?: Db;
  now?: () => Date;
  /** Captures log lines (tests assert PHI never reaches them). */
  logStream?: NodeJS.WritableStream;
  /** Extra routes registered after the core (tests use it for fixture routes). */
  extraRoutes?: (app: FastifyInstance) => void | Promise<void>;
}

/**
 * App factory. Tests use `app.inject()` so no listening server is needed (ADR-2).
 * Order matters: transport, then access hooks, then routes.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const base = loadConfig();
  const config: AppConfig = { ...base, ...options.config };
  const ownsDb = !options.db;
  const db = options.db ?? createDb(config.databaseUrl);

  const app = Fastify({
    logger: loggerOptions(config.logLevel, options.logStream),
    // Fastify's own per-request lines are off; core/logging.ts writes an allow-listed one.
    logController: new LogController({ disableRequestLogging: true }),
    genReqId: () => randomUUID(),
    // Never trust a client-supplied request id.
    requestIdHeader: false,
    bodyLimit: 1024 * 1024,
    // Off by default. "loopback" for the same-origin Next.js proxy (TRUST_PROXY, C1 5.2).
    trustProxy: config.trustProxy === "loopback" ? "loopback" : false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const deps: AppDeps = {
    config,
    db,
    audit: new AuditWriter(db),
    now: options.now ?? (() => new Date()),
  };
  app.decorate("deps", deps);
  if (ownsDb) app.addHook("onClose", async () => db.$disconnect());

  registerErrorHandling(app);
  registerRequestLogging(app);
  await registerOpenApi(app);
  await registerHttp(app);
  registerAccessHooks(app);

  registerOpenApiRoute(app);
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(roleRoutes);
  await app.register(patientRoutes);
  // WP 3.1, delivery step 1: patient reads.
  await app.register(todayRoutes);
  await app.register(carePlanRoutes);
  await app.register(sessionRoutes);
  await app.register(checkInRoutes);
  await app.register(progressRoutes);
  await app.register(clinicRoutes);
  // Step 2: session and check-in writes.
  await app.register(sessionWriteRoutes);
  await app.register(checkInWriteRoutes);
  // Step 3: clinician reads (the directory is GET /patients in patientRoutes).
  await app.register(overviewRoutes);
  await app.register(recordRoutes);
  await app.register(exerciseRoutes);
  await app.register(reviewRoutes);
  // Step 4: plan draft autosave, preview and publish.
  await app.register(carePlanDraftRoutes);
  // Step 5: review task actions, check-in reviewed, review rules.
  await app.register(reviewActionRoutes);
  // Step 6: onboarding, intake, consents, practitioners, care-team assignment.
  await app.register(onboardingRoutes);
  await app.register(intakeRoutes);
  await app.register(consentRoutes);
  await app.register(careTeamRoutes);
  if (options.extraRoutes) await options.extraRoutes(app);

  await app.ready();
  return app;
}
