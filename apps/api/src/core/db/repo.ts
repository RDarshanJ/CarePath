/**
 * The one place the API creates a Prisma client (ADR-8). Other repo.ts files receive the
 * client as `Db`; nothing outside repo.ts files imports Prisma.
 */
import { createPrismaClient, type Prisma, type PrismaClient } from "@carepath/db/client";

export type Db = PrismaClient;
/** A client inside an interactive transaction: model delegates, no $transaction. */
export type DbTx = Prisma.TransactionClient;
/** What repositories take, so the same function runs inside or outside a transaction. */
export type DbClient = Db | DbTx;

/**
 * Runs `fn` in one interactive transaction. Anything it throws rolls the whole transaction back.
 * Route handlers use withTx() (core/db/tx.ts), which adds the audit writer.
 */
export interface TxOptions {
  /** Longest wait for a connection to start the transaction (Prisma default 2 s). */
  maxWait?: number;
  /** Longest the transaction may run (Prisma default 5 s). */
  timeout?: number;
}

export function inTransaction<T>(
  db: Db,
  fn: (tx: DbTx) => Promise<T>,
  options?: TxOptions,
): Promise<T> {
  return options ? db.$transaction(fn, options) : db.$transaction(fn);
}

export function createDb(databaseUrl: string): Db {
  return createPrismaClient(databaseUrl);
}

/** Health check: one round trip. Resolves false instead of throwing. */
export async function pingDatabase(db: Db, timeoutMs = 2_000): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    return await Promise.race([db.$queryRaw`SELECT 1`.then(() => true), timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
