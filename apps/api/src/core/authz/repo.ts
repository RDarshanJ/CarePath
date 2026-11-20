import type { Db } from "../db/repo.js";

/** Role reference rows. Global, not tenant data. */
export async function listRoles(db: Db) {
  return db.role.findMany({
    select: { key: true, name: true, description: true, permissions: true },
    orderBy: { key: "asc" },
  });
}
