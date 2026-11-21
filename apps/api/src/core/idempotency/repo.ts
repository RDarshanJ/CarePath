import type { Prisma } from "@carepath/db/client";
import type { DbClient } from "../db/repo.js";

/** Replay records for requests that carry an Idempotency-Key (CR-17). Scoped by organization and user. */
export interface StoredResponse {
  requestHash: string;
  statusCode: number;
  responseBody: Prisma.JsonValue;
  expiresAt: Date;
}

interface KeyRef {
  orgId: string;
  userId: string;
  scope: string;
  key: string;
}

/**
 * Takes a transaction-scoped advisory lock on the key, so a second request with the same key
 * waits here until the first commits or rolls back, then reads its stored answer (or runs
 * itself when the first failed). Different keys never wait on each other.
 */
export async function lockKey(db: DbClient, ref: KeyRef): Promise<void> {
  await db.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${ref.orgId} || ':' || ${ref.userId} || ':' || ${ref.scope} || ':' || ${ref.key}, 0))`;
}

export async function findKey(db: DbClient, ref: KeyRef): Promise<StoredResponse | null> {
  return db.idempotencyKey.findFirst({
    where: { organizationId: ref.orgId, userId: ref.userId, scope: ref.scope, key: ref.key },
    select: { requestHash: true, statusCode: true, responseBody: true, expiresAt: true },
  });
}

/** Removes a key whose window has passed, so it can be used again. */
export async function deleteKey(db: DbClient, ref: KeyRef): Promise<void> {
  await db.idempotencyKey.deleteMany({
    where: { organizationId: ref.orgId, userId: ref.userId, scope: ref.scope, key: ref.key },
  });
}

export async function storeKey(
  db: DbClient,
  ref: KeyRef,
  data: {
    requestHash: string;
    statusCode: number;
    responseBody: Prisma.InputJsonValue;
    at: Date;
    expiresAt: Date;
  },
): Promise<void> {
  await db.idempotencyKey.create({
    data: {
      organizationId: ref.orgId,
      userId: ref.userId,
      scope: ref.scope,
      key: ref.key,
      requestHash: data.requestHash,
      statusCode: data.statusCode,
      responseBody: data.responseBody,
      createdAt: data.at,
      expiresAt: data.expiresAt,
    },
  });
}
