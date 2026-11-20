import type { Db } from "../core/db/repo.js";

/**
 * The scheduler's one cross-organization read: which organizations exist, so it can enqueue a
 * job per organization. It reads no tenant content.
 */
export async function activeOrganizationIds(db: Db): Promise<string[]> {
  const rows = await db.organization.findMany({ where: { active: true }, select: { id: true } });
  return rows.map((r) => r.id);
}
