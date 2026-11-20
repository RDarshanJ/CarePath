import type { AppConfig } from "../config.js";
import type { AuditWriter } from "./audit/audit.js";
import type { Permission, RoleKey } from "./authz/permissions.js";
import type { Db } from "./db/repo.js";

/**
 * Request context (ADR-8). Built from the session on every authenticated request. Repositories
 * take it and filter on `orgId`; for the patient role they also filter on `patientId`.
 * Nothing in it comes from the request body or query, so a client cannot choose its scope.
 */
export interface RequestCtx {
  requestId: string;
  sessionId: string;
  userId: string;
  orgId: string;
  role: RoleKey;
  permissions: ReadonlySet<Permission>;
  /** Set for the patient role: the only patient this session may see. */
  patientId: string | null;
  /** Set for clinicians. */
  practitionerId: string | null;
}

/** Route-level access declaration. Deny by default: a route without `auth: "public"` needs a session. */
export interface RouteAccess {
  auth?: "public" | "session";
  /** Any one of these permissions is enough. Missing all of them answers 403. */
  permission?: Permission | readonly Permission[];
}

export interface AppDeps {
  config: AppConfig;
  db: Db;
  audit: AuditWriter;
  /** Injectable clock for session timeouts. */
  now: () => Date;
}

declare module "fastify" {
  interface FastifyInstance {
    deps: AppDeps;
  }
  interface FastifyRequest {
    ctx: RequestCtx | null;
    /** HMAC of the client IP. The raw address is never stored or logged. */
    ipHash: string;
  }
  interface FastifyContextConfig {
    access?: RouteAccess;
  }
}

/** For handlers on session routes: the hook has already rejected requests without one. */
export function requireCtx(ctx: RequestCtx | null): RequestCtx {
  if (!ctx) throw new Error("route reached without a session; check its access config");
  return ctx;
}
