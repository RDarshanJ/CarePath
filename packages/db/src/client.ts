/**
 * Server-only entry point: the typed Prisma client over the pg driver adapter.
 * Import from "@carepath/db/client" only in repo.ts files (ADR-8, enforced by ESLint).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export { PrismaClient, Prisma } from "./generated/prisma/client.js";

export const defaultDatabaseUrl = "postgresql://carepath:carepath@127.0.0.1:54329/carepath";

export function createPrismaClient(
  url: string = process.env.DATABASE_URL ?? defaultDatabaseUrl,
): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
