/**
 * Validates eval case files against `EvalCase`: `tsx evals/check.ts <file.json> [...]`.
 * With no arguments, checks every file in `evals/data`. Exit code 1 if any file is invalid.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEvalCase } from "./schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<number> {
  let files = process.argv.slice(2);
  if (files.length === 0) {
    const dir = path.join(here, "data");
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
  }
  let bad = 0;
  for (const file of files) {
    try {
      const json: unknown = JSON.parse(await readFile(file, "utf8"));
      const c = parseEvalCase(json, path.basename(file, ".json"));
      console.log(
        `ok       ${file} (${c.transcript.length} turns, ${c.expectedFacts.length} facts)`,
      );
    } catch (err) {
      bad += 1;
      console.log(`INVALID  ${file}`);
      console.log(`  ${err instanceof Error ? err.message.split("\n").join("\n  ") : String(err)}`);
    }
  }
  console.log(`${files.length - bad} valid, ${bad} invalid`);
  return bad === 0 ? 0 : 1;
}

process.exitCode = await main();
