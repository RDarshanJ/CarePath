/**
 * Prints the number of rows in "Organization" for DATABASE_URL and exits 0. Used by the Vercel
 * build of the API (apps/api/scripts/vercel-build.mjs) to decide whether the database is empty
 * and may be seeded. Run it after migrations: it fails when the table does not exist.
 *
 * Usage: tsx scripts/organization-count.ts
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("organization-count: DATABASE_URL is not set");
  process.exit(2);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const res = await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM "Organization"`);
  console.log(res.rows[0]?.n ?? "0");
} finally {
  await client.end();
}
