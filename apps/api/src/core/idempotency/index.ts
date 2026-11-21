import { createHash } from "node:crypto";
import type { Prisma } from "@carepath/db/client";
import type { RequestCtx } from "../context.js";
import type { DbTx } from "../db/repo.js";
import { AppError } from "../errors.js";
import { deleteKey, findKey, lockKey, storeKey } from "./repo.js";

/**
 * Idempotency for a create request (CR-17, DR-002 F).
 *
 * The client sends `Idempotency-Key: <1 to 128 of A-Z a-z 0-9 _ . : ->` and keeps it for every
 * retry of the same attempt. The key is scoped to the signed-in user and to the operation and
 * target (for example booking for one patient), so another user or another operation never
 * collides with it.
 *
 * - First request: runs, and its success answer (status and body) is stored in the same
 *   transaction as the change, so nothing is stored when the request fails.
 * - Same key, same body: the stored answer is returned and nothing runs again (no second
 *   booking, no second audit event). The response carries `Idempotency-Replayed: true`.
 * - Same key, different body: 409 `idempotency_key_reused`; nothing runs.
 * - Same key at the same time: the second request waits for the first (advisory lock on the
 *   key) and then replays it.
 * - Failed requests store nothing, so retrying a request that was refused (409 booking_conflict,
 *   validation) is a fresh attempt.
 * - A key is honoured for 24 hours from its first success. After that it is treated as new and
 *   the old record is replaced.
 */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

/** SHA-256 of the body with object keys sorted, so key order never changes the hash. */
export function canonicalHash(scope: string, body: unknown): string {
  const canon = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canon)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, x]) => [k, canon(x)]),
          )
        : v;
  return createHash("sha256")
    .update(JSON.stringify({ scope, body: canon(body) }))
    .digest("hex");
}

export interface Idempotent<T> {
  status: number;
  body: T;
  replayed: boolean;
}

/**
 * Runs `run` once per key inside the caller's transaction. Call it first in the transaction,
 * before any row lock, so two requests with one key queue on the key and not on each other's rows.
 */
export async function withIdempotencyKey<T>(
  tx: DbTx,
  ctx: RequestCtx,
  input: { key: string; scope: string; body: unknown; at: Date; status: number },
  run: () => Promise<T>,
): Promise<Idempotent<T>> {
  const ref = { orgId: ctx.orgId, userId: ctx.userId, scope: input.scope, key: input.key };
  const requestHash = canonicalHash(input.scope, input.body);
  await lockKey(tx, ref);
  const existing = await findKey(tx, ref);
  if (existing) {
    if (existing.expiresAt > input.at) {
      if (existing.requestHash !== requestHash) throw new AppError("idempotency_key_reused");
      return { status: existing.statusCode, body: existing.responseBody as T, replayed: true };
    }
    await deleteKey(tx, ref);
  }
  const body = await run();
  await storeKey(tx, ref, {
    requestHash,
    statusCode: input.status,
    responseBody: JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue,
    at: input.at,
    expiresAt: new Date(input.at.getTime() + IDEMPOTENCY_TTL_MS),
  });
  return { status: input.status, body, replayed: false };
}
