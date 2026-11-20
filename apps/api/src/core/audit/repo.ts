import type { DbClient } from "../db/repo.js";
import type { AuditRecord } from "./audit.js";

/**
 * Insert-only. The table rejects UPDATE and DELETE by trigger (CP002). Pass the transaction
 * client when the event describes a change, so both commit or neither does (C1, M4).
 */
export async function insertAuditEvent(db: DbClient, record: AuditRecord): Promise<string> {
  const row = await db.auditEvent.create({
    data: {
      organizationId: record.orgId,
      actorUserId: record.actorUserId,
      actorRole: record.actorRole,
      actorType: record.actorType,
      action: record.action,
      eventName: record.eventName,
      outcome: record.outcome,
      resourceType: record.resourceType ?? null,
      resourceId: record.resourceId ?? null,
      patientId: record.patientId ?? null,
      purposeOfUse: record.purposeOfUse ?? null,
      requestId: record.requestId ?? null,
      sourceIpHash: record.sourceIpHash ?? null,
      detailCode: record.detailCode ?? null,
      metadata: record.metadata ?? {},
    },
    select: { id: true },
  });
  return row.id;
}
