import type { FastifyRequest } from "fastify";
import type { RequestAuditInput } from "../audit/audit.js";
import type { RequestCtx } from "../context.js";
import { inTransaction, type DbTx, type TxOptions } from "./repo.js";

export interface TxScope {
  /** Pass this to every repository call inside the callback. */
  tx: DbTx;
  /** The request context; null on public routes (login, onboarding). */
  ctx: RequestCtx | null;
  /** Writes an audit event for this request inside the same transaction. */
  audit(input: RequestAuditInput): Promise<string>;
}

/**
 * Runs a mutation and its audit event in one transaction (checkpoint C1, M4). If the audit
 * insert fails, the change is rolled back and the request answers 500, so no change is ever
 * committed without its event. Usage in a route handler:
 *
 *   await withTx(request, async ({ tx, ctx, audit }) => {
 *     const row = await updateSomething(tx, requireCtx(ctx), input);
 *     await audit({ eventName: "settings.update", action: "U", outcome: "success", ... });
 *     return row;
 *   });
 */
export function withTx<T>(
  request: FastifyRequest,
  fn: (scope: TxScope) => Promise<T>,
  options?: TxOptions,
): Promise<T> {
  const { db, audit } = request.server.deps;
  return inTransaction(
    db,
    (tx) =>
      fn({
        tx,
        ctx: request.ctx,
        audit: (input) => audit.fromRequest(request, input, tx),
      }),
    options,
  );
}
