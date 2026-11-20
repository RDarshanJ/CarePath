/**
 * Row checksums for determinism checks. Each table is hashed over its rows as canonical JSON in
 * primary-key order. Database-assigned ids never appear: the seed supplies every id, and the
 * Role foreign key on memberships is replaced by the role key.
 */
import { createHash } from "node:crypto";
import type pg from "pg";
import { insertOrder } from "./types.js";

type Db = Pick<pg.ClientBase, "query">;

export interface TableChecksum {
  table: string;
  rows: number;
  md5: string;
}

export async function contentChecksums(
  db: Db,
): Promise<{ tables: TableChecksum[]; totalRows: number; contentHash: string }> {
  await db.query(`SET TIME ZONE 'UTC'`);
  const tables: TableChecksum[] = [];
  for (const table of insertOrder) {
    const source =
      table === "OrganizationMembership"
        ? `SELECT (to_jsonb(m) - 'roleId') || jsonb_build_object('role', r.key) AS j, m.id FROM "OrganizationMembership" m JOIN "Role" r ON r.id = m."roleId"`
        : `SELECT to_jsonb(t) AS j, t.id FROM "${table}" t`;
    const res = await db.query<{ rows: string; md5: string }>(
      `SELECT count(*) AS rows, coalesce(md5(string_agg(j::text, E'\\n' ORDER BY id)), md5('')) AS md5 FROM (${source}) x`,
    );
    const row = res.rows[0] as { rows: string; md5: string };
    tables.push({ table, rows: Number(row.rows), md5: row.md5 });
  }
  const contentHash = createHash("sha256")
    .update(tables.map((t) => `${t.table}:${t.rows}:${t.md5}`).join("\n"))
    .digest("hex");
  return { tables, totalRows: tables.reduce((n, t) => n + t.rows, 0), contentHash };
}
