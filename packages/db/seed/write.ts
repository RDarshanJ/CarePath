/** Writes a Dataset to Postgres in one transaction: reset, insert, post steps, integrity checks. */
import type pg from "pg";
import { checkIntegrity, type Check } from "./integrity.js";
import { insertOrder, type Dataset, type Row, type TableName } from "./types.js";

type Db = Pick<pg.ClientBase, "query">;

const quote = (name: string): string => `"${name}"`;
const CHUNK = 400;
/** Reference data that the migrations own; the seed never touches it. */
const KEEP = new Set(["Role", "StatusTransition", "_prisma_migrations"]);

async function resetTenantData(db: Db): Promise<void> {
  const res = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  const names = res.rows.map((r) => r.table_name).filter((n) => !KEEP.has(n));
  await db.query(`TRUNCATE TABLE ${names.map(quote).join(", ")}`);
}

async function insertRows(db: Db, table: TableName, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0] as Row);
  for (const row of rows) {
    if (Object.keys(row).length !== cols.length)
      throw new Error(`rows of ${table} do not share the same columns`);
  }
  const list = cols.map(quote).join(", ");
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.query(
      `INSERT INTO ${quote(table)} (${list}) SELECT ${list} FROM jsonb_populate_recordset(NULL::${quote(table)}, $1::jsonb)`,
      [JSON.stringify(rows.slice(i, i + CHUNK))],
    );
  }
}

async function updateRows(db: Db, table: TableName, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0] as Row).filter((c) => c !== "id");
  const set = cols.map((c) => `${quote(c)} = v.${quote(c)}`).join(", ");
  for (let i = 0; i < rows.length; i += CHUNK) {
    const res = await db.query(
      `UPDATE ${quote(table)} t SET ${set} FROM jsonb_populate_recordset(NULL::${quote(table)}, $1::jsonb) v WHERE t.id = v.id`,
      [JSON.stringify(rows.slice(i, i + CHUNK))],
    );
    if (res.rowCount !== rows.slice(i, i + CHUNK).length)
      throw new Error(`update of ${table} matched ${res.rowCount} rows`);
  }
}

export interface WriteResult {
  checks: Check[];
}

/**
 * Runs inside a transaction the caller owns. Integrity checks run before the caller commits,
 * so a dataset that fails them is rolled back and leaves the previous data untouched.
 */
export async function writeDataset(db: Db, ds: Dataset): Promise<WriteResult> {
  await db.query(`SET LOCAL TIME ZONE 'UTC'`);
  await resetTenantData(db);

  const roles = await db.query<{ id: string; key: string }>(`SELECT id, key FROM "Role"`);
  const roleId = new Map(roles.rows.map((r) => [r.key, r.id]));

  for (const table of insertOrder) {
    let rows = ds.tables[table] as unknown as Row[];
    if (table === "OrganizationMembership") {
      rows = rows.map((row) => {
        const { roleKey, ...rest } = row as Row & { roleKey: string };
        const id = roleId.get(roleKey);
        if (!id) throw new Error(`Role ${roleKey} is missing; run migrations first`);
        return { ...rest, roleId: id };
      });
    }
    await insertRows(db, table, rows);
  }
  for (const step of ds.post) {
    if (step.kind === "insert") await insertRows(db, step.table, step.rows);
    else await updateRows(db, step.table, step.rows);
  }

  const checks = await checkIntegrity(db, { profile: ds.profile, anchor: ds.anchor });
  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    throw new Error(
      `seed integrity checks failed:\n${failed.map((c) => `  - ${c.name}: ${c.detail}`).join("\n")}`,
    );
  }
  return { checks };
}
