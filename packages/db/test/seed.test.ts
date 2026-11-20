import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashEnrollmentCode } from "@carepath/shared/enrollment-code";
import { verifyPassword } from "@carepath/shared/password";
import { defaultDatabaseUrl } from "../src/client.js";
import { resolveAnchor } from "../seed/anchor.js";
import {
  DEMO_PASSWORD,
  buildDataset,
  checkSeededDatabase,
  demoEnrollmentCodes,
  fixedAccounts,
  profiles,
  runSeed,
  seedPasswordHash,
} from "../seed/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const repoRoot = path.resolve(pkgRoot, "../..");

/**
 * The seed deletes all tenant data, so these tests run it in a database of their own and leave
 * the shared development database (and the parallel constraint tests) alone.
 */
const baseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;
const dbName = `carepath_seed_test_${process.pid}`;
const testUrl = (() => {
  const u = new URL(baseUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
})();

async function admin<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: baseUrl });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

async function withTestDb<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: testUrl });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  await admin((c) => c.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`));
  await admin((c) => c.query(`CREATE DATABASE "${dbName}"`));
  execFileSync("pnpm", ["exec", "tsx", "scripts/schema-engine.ts", "deploy"], {
    cwd: pkgRoot,
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "pipe",
  });
}, 120_000);

afterAll(async () => {
  await admin((c) => c.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`));
});

describe("seed generator (no database)", () => {
  it("is a pure function of profile, seed and anchor", async () => {
    const passwordHash = await seedPasswordHash();
    const a = buildDataset(profiles.small, { passwordHash });
    const b = buildDataset(profiles.small, { passwordHash });
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    const other = buildDataset(profiles.small, { passwordHash, seed: "another-seed" });
    expect(JSON.stringify(other.tables)).not.toBe(JSON.stringify(a.tables));
  });

  it("small profile matches its targets", async () => {
    const ds = buildDataset(profiles.small, { passwordHash: await seedPasswordHash() });
    expect(ds.tables.Organization).toHaveLength(2);
    expect(ds.tables.Practitioner).toHaveLength(6);
    expect(ds.tables.Patient).toHaveLength(40);
    expect(ds.tables.Appointment).toHaveLength(90);
    // The profile count plus patient.demo's Scenario F visit without a note (WP 5.2).
    expect(ds.tables.Encounter).toHaveLength(8 + 1);
    expect(new Set(ds.tables.Exercise.map((e) => e.slug)).size).toBe(50);
  });

  it("full profile carries the brief's targets", async () => {
    const ds = buildDataset(profiles.full, { passwordHash: await seedPasswordHash() });
    expect(ds.tables.Organization).toHaveLength(5);
    expect(ds.tables.Practitioner).toHaveLength(30);
    expect(ds.tables.Patient).toHaveLength(1000);
    expect(ds.tables.Appointment).toHaveLength(2000);
    expect(ds.tables.SessionActivity).toHaveLength(10000);
    expect(ds.tables.Encounter).toHaveLength(50 + 1);
    expect(ds.tables.Exercise).toHaveLength(250);
  });

  it("never reads the wall clock or Math.random", () => {
    const dir = path.join(pkgRoot, "seed");
    const files = [
      ...readdirSync(dir)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => path.join(dir, f)),
      ...readdirSync(path.join(dir, "data")).map((f) => path.join(dir, "data", f)),
    ];
    for (const file of files) {
      // The CLI reads the clock for `--anchor now` only and passes the result in (resolveAnchor).
      if (path.basename(file) === "cli.ts") continue;
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(/Math\.random|Date\.now\s*\(|new Date\s*\(\s*\)/);
    }
  });

  it("resolves --anchor now to the current hour and validates explicit instants", () => {
    const now = Date.parse("2026-12-03T14:37:12.345Z");
    expect(resolveAnchor("now", now)).toBe("2026-12-03T14:00:00.000Z");
    expect(resolveAnchor(undefined, now)).toBe("2026-11-19T16:00:00.000Z");
    expect(resolveAnchor("2026-11-23T20:00:00Z", now)).toBe("2026-11-23T20:00:00.000Z");
    expect(() => resolveAnchor("next tuesday", now)).toThrow(/invalid --anchor/);
  });

  it("hashes the demo password in the shared scrypt format", async () => {
    const hash = await seedPasswordHash();
    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword(DEMO_PASSWORD, hash)).toBe(true);
    expect(await verifyPassword("not the password", hash)).toBe(false);
  });

  it("documents every fixed account in docs/demo-accounts.md", () => {
    const doc = readFileSync(path.join(repoRoot, "docs/demo-accounts.md"), "utf8");
    expect(doc).toContain(DEMO_PASSWORD);
    for (const [email] of fixedAccounts) expect(doc, email).toContain(email);
    const codes = demoEnrollmentCodes(0);
    for (const code of [...codes.unused, codes.used, codes.expired])
      expect(doc, code).toContain(code);
  });
});

describe("seed in a database", () => {
  it("small profile: same seed twice gives identical rows, checksums and hash", async () => {
    const first = await runSeed({ url: testUrl, profile: "small" });
    // Application data added between runs must be replaced, not kept.
    await withTestDb((c) =>
      c.query(`INSERT INTO "Organization" (name, slug) VALUES ('Leftover', 'leftover')`),
    );
    const second = await runSeed({ url: testUrl, profile: "small" });

    expect(second.tables).toEqual(first.tables);
    expect(second.totalRows).toBe(first.totalRows);
    expect(second.contentHash).toBe(first.contentHash);
    expect(first.tables.find((t) => t.table === "Organization")?.rows).toBe(2);
    expect(first.checks.length).toBeGreaterThan(40);
    expect(first.checks.filter((c) => !c.ok)).toEqual([]);

    const again = await checkSeededDatabase({ url: testUrl, profile: "small" });
    expect(again.checks.filter((c) => !c.ok)).toEqual([]);
    expect(again.contentHash).toBe(first.contentHash);
  }, 120_000);

  it("a different seed gives a different content hash", async () => {
    const base = await withTestDb(async () =>
      checkSeededDatabase({ url: testUrl, profile: "small" }),
    );
    const other = await runSeed({ url: testUrl, profile: "small", seed: "carepath-seed-2" });
    expect(other.contentHash).not.toBe(base.contentHash);
    expect(other.totalRows).toBeGreaterThan(0);
    await runSeed({ url: testUrl, profile: "small" });
  }, 120_000);

  it("integrity checks catch data that breaks the seed's guarantees", async () => {
    await runSeed({ url: testUrl, profile: "small" });
    await withTestDb((c) =>
      c.query(`UPDATE "Patient" SET mrn = 'REAL-1' WHERE id = (SELECT id FROM "Patient" LIMIT 1)`),
    );
    const result = await checkSeededDatabase({ url: testUrl, profile: "small" });
    const failed = result.checks.filter((c) => !c.ok).map((c) => c.name);
    expect(failed).toContain("every MRN starts with SYN-");
    await runSeed({ url: testUrl, profile: "small" });
  }, 120_000);

  it("seeded demo passwords verify against the stored hashes", async () => {
    await runSeed({ url: testUrl, profile: "small" });
    const rows = await withTestDb((c) =>
      c.query<{ passwordHash: string }>(
        `SELECT "passwordHash" FROM "User" WHERE email = 'patient.demo@carepath.test'`,
      ),
    );
    expect(await verifyPassword(DEMO_PASSWORD, rows.rows[0]!.passwordHash)).toBe(true);
  }, 120_000);

  it("full profile writes cleanly and passes the integrity checks", async () => {
    const report = await runSeed({ url: testUrl, profile: "full" });
    expect(report.checks.filter((c) => !c.ok)).toEqual([]);
    expect(report.tables.find((t) => t.table === "Patient")?.rows).toBe(1000);
    expect(report.tables.find((t) => t.table === "SessionActivity")?.rows).toBe(10000);
    await runSeed({ url: testUrl, profile: "small" });
  }, 180_000);

  // Checkpoint C1 ruling 3.8: `--anchor now` moves the seeded world, so the integrity checks
  // must hold whichever weekday and hour the anchor falls on.
  it.each([
    ["Saturday, 03:00 UTC", "2026-11-21T03:00:00Z"],
    ["Monday, 20:00 UTC", "2026-11-23T20:00:00Z"],
    ["Wednesday, 06:00 UTC", "2026-11-25T06:00:00Z"],
  ])(
    "integrity checks pass with the anchor on a %s",
    async (_label, anchor) => {
      const report = await runSeed({ url: testUrl, profile: "small", anchor });
      expect(report.checks.filter((c) => !c.ok)).toEqual([]);
      expect(report.anchor).toBe(new Date(anchor).toISOString());
    },
    120_000,
  );

  it("seeds three unused, one used and one expired enrollment code per organization", async () => {
    const report = await runSeed({ url: testUrl, profile: "small" });
    const codes = demoEnrollmentCodes(0);
    const rows = await withTestDb((c) =>
      c.query<{ codeHash: string; redeemed: boolean; expired: boolean }>(
        `SELECT "codeHash", "redeemedAt" IS NOT NULL AS redeemed, "expiresAt" <= $1::timestamptz AS expired
         FROM "EnrollmentCode" e JOIN "Organization" o ON o.id = e."organizationId" WHERE o.slug = 'fictional-desert-rehab'`,
        [report.anchor],
      ),
    );
    const byHash = new Map(rows.rows.map((r) => [r.codeHash, r]));
    for (const code of codes.unused)
      expect(byHash.get(hashEnrollmentCode(code))).toEqual(
        expect.objectContaining({ redeemed: false, expired: false }),
      );
    expect(byHash.get(hashEnrollmentCode(codes.used))?.redeemed).toBe(true);
    expect(byHash.get(hashEnrollmentCode(codes.expired))).toEqual(
      expect.objectContaining({ redeemed: false, expired: true }),
    );
    // Pasted codes match however they are spaced or cased.
    expect(hashEnrollmentCode(` ${codes.unused[0]!.toLowerCase()} `)).toBe(
      hashEnrollmentCode(codes.unused[0]!),
    );
  }, 120_000);

  it("refuses to seed a database that is not on this machine", async () => {
    await expect(
      runSeed({ url: "postgresql://u:p@db.example.com:5432/x", profile: "small" }),
    ).rejects.toThrow(/refusing to seed/);
  });
});
