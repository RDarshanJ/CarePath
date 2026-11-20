/**
 * Seed generator public surface. `runSeed` generates a dataset for a profile and writes it to
 * a database in one transaction; `contentChecksums` and `checkIntegrity` verify it.
 */
import pg from "pg";
import { buildDataset } from "./build.js";
import { checkIntegrity, type Check } from "./integrity.js";
import { contentChecksums, type TableChecksum } from "./checksum.js";
import { seedPasswordHash } from "./password.js";
import {
  DEFAULT_ANCHOR,
  DEFAULT_SEED,
  profiles,
  type ProfileName,
  type SeedProfile,
} from "./profiles.js";
import type { Dataset } from "./types.js";
import { writeDataset } from "./write.js";

export { buildDataset } from "./build.js";
export { checkIntegrity, fixedAccounts, type Check } from "./integrity.js";
export { contentChecksums, type TableChecksum } from "./checksum.js";
export { DEMO_PASSWORD } from "./people.js";
export { seedPasswordHash } from "./password.js";
export {
  DEFAULT_ANCHOR,
  DEFAULT_SEED,
  profiles,
  isProfileName,
  type ProfileName,
  type SeedProfile,
} from "./profiles.js";
export type { Dataset, DemoAccount } from "./types.js";

export const defaultSeedUrl = "postgresql://carepath:carepath@127.0.0.1:54329/carepath";

export interface RunSeedOptions {
  /** Database to seed. It is emptied of tenant data first. */
  url?: string;
  profile?: ProfileName | SeedProfile;
  seed?: string;
  anchor?: string;
}

export interface SeedReport {
  profile: string;
  seed: string;
  anchor: string;
  tables: TableChecksum[];
  totalRows: number;
  contentHash: string;
  checks: Check[];
  generateMs: number;
  writeMs: number;
  dataset: Dataset;
}

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** Refuse to wipe a database that is not on this machine unless explicitly allowed. */
export function assertLocalDatabase(url: string): void {
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host) && process.env.CAREPATH_ALLOW_REMOTE_SEED !== "1") {
    throw new Error(
      `refusing to seed ${host}: the seed deletes tenant data. Set CAREPATH_ALLOW_REMOTE_SEED=1 to allow it.`,
    );
  }
}

export async function runSeed(options: RunSeedOptions = {}): Promise<SeedReport> {
  const url = options.url ?? process.env.DATABASE_URL ?? defaultSeedUrl;
  assertLocalDatabase(url);
  const profile =
    typeof options.profile === "object" ? options.profile : profiles[options.profile ?? "small"];
  const t0 = performance.now();
  const dataset = buildDataset(profile, {
    seed: options.seed ?? DEFAULT_SEED,
    anchor: options.anchor ?? DEFAULT_ANCHOR,
    passwordHash: await seedPasswordHash(),
  });
  const t1 = performance.now();
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("BEGIN");
    let checks: Check[];
    try {
      ({ checks } = await writeDataset(client, dataset));
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
    const sums = await contentChecksums(client);
    return {
      profile: profile.name,
      seed: dataset.seed,
      anchor: dataset.anchor,
      ...sums,
      checks,
      generateMs: Math.round(t1 - t0),
      writeMs: Math.round(performance.now() - t1),
      dataset,
    };
  } finally {
    await client.end();
  }
}

/** Integrity checks and checksums for whatever is in the database now (`--check`). */
export async function checkSeededDatabase(
  options: { url?: string; profile?: ProfileName | SeedProfile; anchor?: string } = {},
) {
  const url = options.url ?? process.env.DATABASE_URL ?? defaultSeedUrl;
  const profile =
    typeof options.profile === "object" ? options.profile : profiles[options.profile ?? "small"];
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const checks = await checkIntegrity(client, {
      profile,
      anchor: options.anchor ?? DEFAULT_ANCHOR,
    });
    return { checks, ...(await contentChecksums(client)) };
  } finally {
    await client.end();
  }
}
