/**
 * `pnpm ai:eval [--data <dir>] [--out <file.md>] [--provider deterministic|anthropic]`
 *
 * Reads every `case-*.json` in the data directory (default `packages/ai/evals/data`), runs the SOAP
 * note draft pipeline, and writes the report (default `docs/evaluation/ai-eval.md`) plus the raw
 * results beside it (`.json`). The default provider is the deterministic one. `anthropic` needs
 * CAREPATH_ANTHROPIC_API_KEY and CAREPATH_ANTHROPIC_MODEL and sends redacted transcripts to the API.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { anthropicProviderFromEnv } from "../src/providers/anthropic.js";
import { DeterministicProvider } from "../src/providers/deterministic.js";
import type { LLMProvider } from "../src/providers/types.js";
import { renderReport, runEval } from "./harness.js";
import { parseEvalCase, type EvalCase } from "./schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<number> {
  const dataDir = path.resolve(arg("data") ?? path.join(here, "data"));
  const outMd = path.resolve(arg("out") ?? path.join(repoRoot, "docs/evaluation/ai-eval.md"));
  const providerName = arg("provider") ?? "deterministic";

  let provider: LLMProvider;
  if (providerName === "deterministic") provider = new DeterministicProvider();
  else if (providerName === "anthropic") {
    const p = anthropicProviderFromEnv();
    if (!p) {
      console.error(
        "anthropic provider needs CAREPATH_ANTHROPIC_API_KEY and CAREPATH_ANTHROPIC_MODEL",
      );
      return 2;
    }
    provider = p;
  } else {
    console.error(`unknown provider ${providerName}`);
    return 2;
  }

  const files = (await readdir(dataDir)).filter((f) => /^case-.*\.json$/.test(f)).sort();
  if (files.length === 0) {
    console.error(`no case-*.json files in ${dataDir}`);
    return 2;
  }
  const cases: EvalCase[] = [];
  const invalidCases: { file: string; error: string }[] = [];
  const hash = createHash("sha256");
  for (const f of files) {
    const raw = await readFile(path.join(dataDir, f), "utf8");
    hash.update(f).update(raw);
    try {
      cases.push(parseEvalCase(JSON.parse(raw), path.basename(f, ".json")));
    } catch (err) {
      invalidCases.push({ file: f, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const summary = await runEval(cases, provider, { invalidCases });
  let commit = "unknown";
  try {
    commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot })
      .toString()
      .trim();
    const dirty = execFileSync("git", ["status", "--porcelain", "--", "packages/ai"], {
      cwd: repoRoot,
    })
      .toString()
      .trim();
    if (dirty) commit += " with uncommitted changes in packages/ai";
  } catch {
    /* not a git checkout */
  }
  const reviewFile = path.join(dataDir, "REVIEW.md");
  const review = existsSync(reviewFile) ? await readFile(reviewFile, "utf8") : null;
  const meta = {
    generatedAt: new Date().toISOString(),
    commit,
    dataset: path.relative(repoRoot, dataDir),
    datasetSha256: hash.digest("hex"),
    review,
  };
  await mkdir(path.dirname(outMd), { recursive: true });
  await writeFile(outMd, renderReport(summary, meta));
  await writeFile(
    outMd.replace(/\.md$/, ".json"),
    `${JSON.stringify({ ...meta, review: undefined, summary }, null, 2)}\n`,
  );
  console.log(
    `${summary.cases} cases, ${summary.schemaValidOutputs} schema-valid, ${summary.unsupportedStatements}/${summary.statements} unsupported, ${summary.factsRecalled}/${summary.facts} facts recalled, injection followed ${summary.injection.followed}/${summary.injection.cases}`,
  );
  console.log(`wrote ${path.relative(repoRoot, outMd)}`);
  return invalidCases.length ? 1 : 0;
}

process.exitCode = await main();
