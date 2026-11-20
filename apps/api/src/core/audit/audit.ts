import type { FastifyRequest } from "fastify";
import type { RoleKey } from "../authz/permissions.js";
import type { Db } from "../db/repo.js";
import { insertAuditEvent } from "./repo.js";

/**
 * Audit event writer (PRD section 13, research section 2.3). Events hold actor, route template,
 * resource type and id, and outcome. They never hold request bodies, names, free text or
 * other patient content (AC-I7): `metadata` accepts only short scalar values, and callers pass
 * route templates, not raw URLs.
 */
export const auditEventNames = [
  "auth.login",
  "auth.login_failed",
  "auth.logout",
  "account.create",
  "consent.grant",
  "consent.revoke",
  "phi.read",
  "careplan.publish",
  "note.sign",
  "ai.generate",
  "ai.refused",
  "ai.review",
  "review_task.resolve",
  "review_rule.update",
  "appointment.book",
  "appointment.cancel",
  "assignment.create",
  "availability.update",
  "settings.update",
  "export.fhir",
  "import.fhir",
  "security.access_denied",
] as const;
export type AuditEventName = (typeof auditEventNames)[number];

type Scalar = string | number | boolean;

export interface AuditRecord {
  eventName: AuditEventName;
  action: "C" | "R" | "U" | "D" | "E";
  outcome: "success" | "minor_failure" | "serious_failure" | "major_failure";
  orgId: string | null;
  actorUserId: string | null;
  actorRole: RoleKey | null;
  actorType: "user" | "system" | "ai";
  resourceType?: string | null;
  resourceId?: string | null;
  /** Only for a patient inside `orgId`; out-of-scope ids go in resourceId instead. */
  patientId?: string | null;
  purposeOfUse?: "treatment" | "operations" | "patient_access" | "admin" | "export" | null;
  requestId?: string | null;
  sourceIpHash?: string | null;
  /** Machine-readable reason, for example "missing_permission" or "out_of_scope". */
  detailCode?: string | null;
  metadata?: Record<string, Scalar>;
}

export type RequestAuditInput = Omit<
  AuditRecord,
  "orgId" | "actorUserId" | "actorRole" | "actorType" | "requestId" | "sourceIpHash"
> &
  Partial<Pick<AuditRecord, "orgId" | "actorUserId" | "actorRole">>;

const MAX_METADATA_VALUE = 120;

function cleanMetadata(metadata: Record<string, Scalar> | undefined): Record<string, Scalar> {
  const out: Record<string, Scalar> = {};
  for (const [k, v] of Object.entries(metadata ?? {})) {
    out[k] = typeof v === "string" ? v.slice(0, MAX_METADATA_VALUE) : v;
  }
  return out;
}

export class AuditWriter {
  constructor(private readonly db: Db) {}

  async record(record: AuditRecord): Promise<string> {
    return insertAuditEvent(this.db, { ...record, metadata: cleanMetadata(record.metadata) });
  }

  /** Fills actor, request id, IP hash, route template and method from the request. */
  async fromRequest(request: FastifyRequest, input: RequestAuditInput): Promise<string> {
    const ctx = request.ctx;
    const actorUserId = input.actorUserId !== undefined ? input.actorUserId : (ctx?.userId ?? null);
    return this.record({
      ...input,
      orgId: input.orgId !== undefined ? input.orgId : (ctx?.orgId ?? null),
      actorUserId,
      actorRole: input.actorRole !== undefined ? input.actorRole : (ctx?.role ?? null),
      // The schema requires a user id for actorType "user". A request with no known account
      // (failed login for an unknown email) is recorded as "system" and flagged anonymous.
      actorType: actorUserId ? "user" : "system",
      requestId: request.id,
      sourceIpHash: request.ipHash,
      metadata: {
        route: request.routeOptions.url ?? "unmatched",
        method: request.method,
        ...(actorUserId ? {} : { anonymous: true }),
        ...input.metadata,
      },
    });
  }
}
