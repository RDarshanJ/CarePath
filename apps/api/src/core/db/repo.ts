/**
 * The one place the API creates a Prisma client (ADR-8). Other repo.ts files receive the
 * client as `Db`; nothing outside repo.ts files imports Prisma.
 */
import { createPrismaClient, type PrismaClient } from "@carepath/db/client";

export type Db = PrismaClient;

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
