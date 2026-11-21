#!/usr/bin/env node
/**
 * Vercel build step for the API (docs/deployment.md). Run by `pnpm run vercel-build`.
 *
 * The workspace packages export TypeScript source (`"exports": "./src/index.ts"`) and the API
 * runs through tsx (checkpoint C1, ruling 3.6). A Vercel Function runs plain Node, so this step
 * compiles every runtime TypeScript file to JavaScript beside itself, with the same module
 * layout, and points the workspace package manifests at the .js files. Nothing moves, so
 * `import.meta.url` lookups (Prisma's query compiler, @medplum/definitions) resolve as in
 * development. Type checking is not repeated here; `pnpm verify` does it.
 *
 * It rewrites files in the checkout, so it refuses to run outside a throwaway build tree: on
 * Vercel (VERCEL=1) or in a copy made by scripts/vercel-check.sh (CAREPATH_VERCEL_BUILD_COPY=1).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

if (process.env.VERCEL !== "1" && process.env.CAREPATH_VERCEL_BUILD_COPY !== "1") {
  console.error(
    "vercel-build: refusing to run: it rewrites files in place. Use scripts/vercel-check.sh locally.",
  );
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
// packages/ai/src imports schemas from packages/ai/evals, so that folder is compiled too.
const sourceDirs = [
  "apps/api/src",
  "packages/db/src",
  "packages/shared/src",
  "packages/ai/src",
  "packages/ai/evals",
  "packages/fhir/src",
];
const manifests = ["packages/db", "packages/shared", "packages/ai", "packages/fhir"];

const compilerOptions = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
  isolatedModules: true,
  // Elide imports used only as types, whether or not they say `import type`.
  verbatimModuleSyntax: false,
  esModuleInterop: true,
  sourceMap: false,
};

function* tsFiles(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* tsFiles(full);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts") && !name.endsWith(".test.ts")) {
      yield full;
    }
  }
}

let compiled = 0;
for (const dir of sourceDirs) {
  for (const file of tsFiles(path.join(root, dir))) {
    const out = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions,
      fileName: file,
      reportDiagnostics: true,
    });
    if (out.diagnostics?.length) {
      for (const d of out.diagnostics) {
        console.error(
          `${path.relative(root, file)}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`,
        );
      }
      process.exit(1);
    }
    writeFileSync(file.slice(0, -3) + ".js", out.outputText);
    compiled += 1;
  }
}

/** "./src/x.ts" becomes "./src/x.js"; anything outside src (evals, seed) is left alone. */
function retarget(value) {
  if (typeof value === "string") {
    return value.startsWith("./src/") && value.endsWith(".ts") ? value.slice(0, -3) + ".js" : value;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, retarget(v)]));
  }
  return value;
}

for (const dir of manifests) {
  const file = path.join(root, dir, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf8"));
  if (pkg.main) pkg.main = retarget(pkg.main);
  if (pkg.exports) pkg.exports = retarget(pkg.exports);
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log(
  `vercel-build: compiled ${compiled} files; retargeted ${manifests.length} package manifests`,
);
