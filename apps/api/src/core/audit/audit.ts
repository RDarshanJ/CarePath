import type { FastifyRequest } from "fastify";
import { auditEventNames, type AuditEventName } from "@carepath/shared/contracts";
import type { RoleKey } from "../authz/permissions.js";
import type { Db, DbClient } from "../db/repo.js";
import { insertAuditEvent } from "./repo.js";

/**
 * Audit event writer (PRD section 13, research section 2.3). Events hold actor, route template,
 * resource type and id, and outcome. They never hold request bodies, names, free text or
 * other patient content (AC-I7): `metadata` accepts only short scalar values, and callers pass
 * route templates, not raw URLs.
 */
export { auditEventNames, type AuditEventName };

type Scalar = string | number | boolean;

export interface AuditRecord {
  eventName: AuditEventName;
  action: "C" | "R" | "U" | "D" | "E";
  outcome: "success" | "minor_failure" | "serious_failure" | "major_failure";
  orgId: string | null;
  actorUserId: string | null;
  actorRole: RoleKey | null;
  /** system: jobs and automated rules only. anonymous: a caller with no known account. */
  actorType: "user" | "system" | "ai" | "anonymous";
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

/**
 * Writes audit events. Without a client it uses the root client, which suits events that
 * describe no change (reads, denials, failed logins). An event that describes a change must
 * be written with the transaction client of that change: use withTx() from core/db/tx.ts,
 * so a failed audit insert rolls the change back (checkpoint C1, M4).
 */
export class AuditWriter {
  constructor(private readonly db: Db) {}

  async record(record: AuditRecord, client: DbClient = this.db): Promise<string> {
    return insertAuditEvent(client, { ...record, metadata: cleanMetadata(record.metadata) });
  }

  /** Fills actor, request id, IP hash, route template and method from the request. */
  async fromRequest(
    request: FastifyRequest,
    input: RequestAuditInput,
    client: DbClient = this.db,
  ): Promise<string> {
    const ctx = request.ctx;
    const actorUserId = input.actorUserId !== undefined ? input.actorUserId : (ctx?.userId ?? null);
    return this.record(
      {
        ...input,
        orgId: input.orgId !== undefined ? input.orgId : (ctx?.orgId ?? null),
        actorUserId,
        actorRole: input.actorRole !== undefined ? input.actorRole : (ctx?.role ?? null),
        // A request with no known account (failed login for an unknown email) is "anonymous"
        // (checkpoint C1, ruling 3.1). "system" is reserved for jobs and automated rules.
        actorType: actorUserId ? "user" : "anonymous",
        requestId: request.id,
        sourceIpHash: request.ipHash,
        metadata: {
          route: request.routeOptions.url ?? "unmatched",
          method: request.method,
          ...input.metadata,
        },
      },
      client,
    );
  }
}
