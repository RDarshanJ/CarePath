import type { Prisma } from "@carepath/db/client";
import type { AuditEvent, AuditQuery } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../../core/context.js";
import type { DbClient } from "../../../core/db/repo.js";
import { AppError } from "../../../core/errors.js";

/**
 * Audit reads (CR-15). The table is insert-only. A page is keyed on (occurredAt, id), newest
 * first, so a cursor stays valid while new events arrive. Rows of another organization, and
 * events with no organization (failed sign-ins for unknown emails), are never returned.
 */
type Scope = Pick<RequestCtx, "orgId">;

export interface AuditCursor {
  t: string;
  i: string;
}

export function encodeAuditCursor(c: AuditCursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeAuditCursor(cursor: string | undefined): AuditCursor | null {
  if (cursor === undefined) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "t" in parsed &&
      "i" in parsed &&
      typeof parsed.t === "string" &&
      typeof parsed.i === "string" &&
      !Number.isNaN(Date.parse(parsed.t)) &&
      /^[0-9a-f-]{36}$/.test(parsed.i)
    ) {
      return { t: parsed.t, i: parsed.i };
    }
  } catch {
    // fall through
  }
  throw new AppError("validation_error", [
    { path: "querystring.cursor", issue: "invalid_cursor", message: "Unknown cursor." },
  ]);
}

export async function listAuditEvents(
  db: DbClient,
  scope: Scope,
  q: AuditQuery & { limit: number },
  cursor: AuditCursor | null,
): Promise<{ items: AuditEvent[]; next: AuditCursor | null }> {
  const and: Prisma.AuditEventWhereInput[] = [];
  if (q.from || q.to) {
    and.push({
      occurredAt: {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lt: new Date(q.to) } : {}),
      },
    });
  }
  if (cursor) {
    const t = new Date(cursor.t);
    and.push({ OR: [{ occurredAt: { lt: t } }, { occurredAt: t, id: { lt: cursor.i } }] });
  }
  const rows = await db.auditEvent.findMany({
    where: {
      organizationId: scope.orgId,
      ...(q.actorUserId ? { actorUserId: q.actorUserId } : {}),
      ...(q.eventName ? { eventName: q.eventName } : {}),
      ...(q.action ? { action: q.action } : {}),
      ...(q.resourceType ? { resourceType: q.resourceType } : {}),
      ...(q.resourceId ? { resourceId: q.resourceId } : {}),
      ...(q.patientId ? { patientId: q.patientId } : {}),
      ...(q.outcome ? { outcome: q.outcome } : {}),
      AND: and,
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: q.limit + 1,
    select: {
      id: true,
      occurredAt: true,
      eventName: true,
      action: true,
      outcome: true,
      actorType: true,
      actorUserId: true,
      actorRole: true,
      actor: { select: { displayName: true } },
      resourceType: true,
      resourceId: true,
      patient: { select: { id: true, givenName: true, familyName: true } },
      purposeOfUse: true,
      detailCode: true,
      requestId: true,
      metadata: true,
    },
  });
  const page = rows.slice(0, q.limit);
  const last = page[page.length - 1];
  const items: AuditEvent[] = page.map((r) => ({
    id: r.id,
    occurredAt: r.occurredAt.toISOString(),
    eventName: r.eventName,
    action: r.action,
    outcome: r.outcome,
    actor: {
      type: r.actorType,
      userId: r.actorUserId,
      name: r.actor?.displayName ?? null,
      role: r.actorRole,
    },
    resourceType: r.resourceType,
    resourceId: r.resourceId,
    patient: r.patient
      ? { id: r.patient.id, name: `${r.patient.givenName} ${r.patient.familyName}` }
      : null,
    purposeOfUse: r.purposeOfUse,
    detailCode: r.detailCode,
    requestId: r.requestId,
    metadata: scalarRecord(r.metadata),
  }));
  return {
    items,
    next: rows.length > q.limit && last ? { t: last.occurredAt.toISOString(), i: last.id } : null,
  };
}

function scalarRecord(value: Prisma.JsonValue): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
    }
  }
  return out;
}
