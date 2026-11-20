/**
 * pnpm db:seed [--profile small|full] [--seed <text>] [--anchor <ISO instant>] [--check] [--json]
 * Replaces all tenant data in the local database with a deterministic synthetic dataset, runs the
 * integrity checks, and prints one checksum per table plus a content hash. Running it twice
 * prints the same hashes.
 */
import {
  checkSeededDatabase,
  DEFAULT_ANCHOR,
  DEFAULT_SEED,
  isProfileName,
  profiles,
  runSeed,
} from "./index.js";

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (!arg.startsWith("--")) continue;
    const [name, inline] = arg.slice(2).split("=", 2) as [string, string | undefined];
    if (inline !== undefined) out[name] = inline;
    else if (argv[i + 1] !== undefined && !(argv[i + 1] as string).startsWith("--"))
      out[name] = argv[++i] as string;
    else out[name] = true;
  }
  return out;
}

function printTable(rows: { table: string; rows: number; md5: string }[]): void {
  const width = Math.max(...rows.map((r) => r.table.length));
  for (const r of rows)
    console.log(`  ${r.table.padEnd(width)}  ${String(r.rows).padStart(7)}  ${r.md5}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const profileName = typeof args.profile === "string" ? args.profile : "small";
  if (!isProfileName(profileName)) {
    throw new Error(
      `unknown profile "${profileName}"; use one of: ${Object.keys(profiles).join(", ")}`,
    );
  }
  const seed = typeof args.seed === "string" ? args.seed : DEFAULT_SEED;
  const anchor = typeof args.anchor === "string" ? args.anchor : DEFAULT_ANCHOR;

  if (args.check) {
    const result = await checkSeededDatabase({ profile: profileName, anchor });
    const failed = result.checks.filter((c) => !c.ok);
    for (const c of failed) console.error(`FAILED ${c.name}: ${c.detail}`);
    console.log(
      `seed check: ${result.checks.length - failed.length}/${result.checks.length} integrity checks passed`,
    );
    console.log(`content-hash: ${result.contentHash}`);
    if (failed.length > 0) process.exitCode = 1;
    return;
  }

  const report = await runSeed({ profile: profileName, seed, anchor });
  if (args.json) {
    const rest: Record<string, unknown> = { ...report };
    delete rest.dataset;
    console.log(JSON.stringify(rest, null, 2));
    return;
  }
  console.log(`seed: profile=${report.profile} seed=${report.seed} anchor=${report.anchor}`);
  console.log(
    `synthetic data only; generated in ${report.generateMs} ms, written in ${report.writeMs} ms`,
  );
  printTable(report.tables);
  console.log(`total rows: ${report.totalRows}`);
  console.log(`integrity checks: ${report.checks.length} passed`);
  console.log(`content-hash: ${report.contentHash}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
