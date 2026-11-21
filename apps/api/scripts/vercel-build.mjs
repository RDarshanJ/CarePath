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
 *
 * Database step, first, only with VERCEL=1 and VERCEL_ENV=production (preview builds never touch
 * the database, which they may share with production):
 *   CAREPATH_DEPLOY_MIGRATE=1  apply migrations (WebAssembly schema engine) to
 *                              DATABASE_URL_UNPOOLED, or DATABASE_URL when that is unset.
 *                              A failed migration fails the build.
 *   CAREPATH_DEPLOY_SEED=1     then load the small synthetic seed with --anchor now, but only when
 *                              the database has no Organization rows. A database with tenant data
 *                              is never reseeded, unless
 *   CAREPATH_DEPLOY_RESEED=1   is also set: then the seed replaces all tenant data. Set it for one
 *                              deploy and remove it, or every production build resets the demo.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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

function databaseStep() {
  const env = process.env;
  const wanted = env.CAREPATH_DEPLOY_MIGRATE === "1" || env.CAREPATH_DEPLOY_SEED === "1";
  if (!wanted) {
    console.log(
      "vercel-build: database step off (CAREPATH_DEPLOY_MIGRATE and CAREPATH_DEPLOY_SEED unset)",
    );
    return;
  }
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "production") {
    console.log(
      `vercel-build: database step skipped: only production builds on Vercel run it (VERCEL_ENV=${env.VERCEL_ENV ?? "unset"})`,
    );
    return;
  }
  const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!url)
    fatal(
      "CAREPATH_DEPLOY_MIGRATE or CAREPATH_DEPLOY_SEED is set but no DATABASE_URL_UNPOOLED or DATABASE_URL",
    );
  if (env.CAREPATH_DEPLOY_SEED === "1" && env.CAREPATH_DEPLOY_MIGRATE !== "1") {
    fatal(
      "CAREPATH_DEPLOY_SEED=1 needs CAREPATH_DEPLOY_MIGRATE=1, so the schema is current before the seed",
    );
  }
  const host = new URL(url).hostname;
  const dbEnv = { ...env, DATABASE_URL: url };
  const db = (args, extraEnv = {}, capture = false) =>
    spawnSync("pnpm", ["--filter", "@carepath/db", ...args], {
      cwd: root,
      env: { ...dbEnv, ...extraEnv },
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
      encoding: "utf8",
    });

  console.log(`vercel-build: migrating ${host}`);
  const migrate = db(["run", "migrate:deploy"]);
  if (migrate.status !== 0)
    fatal(`migration failed on ${host} (exit ${migrate.status}); the build stops here`);

  if (env.CAREPATH_DEPLOY_SEED !== "1") return;
  const count = db(["exec", "tsx", "scripts/organization-count.ts"], {}, true);
  const organizations = Number(String(count.stdout).trim().split("\n").pop());
  if (count.status !== 0 || !Number.isInteger(organizations)) {
    fatal(`could not count organizations on ${host} (exit ${count.status})`);
  }
  const reseed = env.CAREPATH_DEPLOY_RESEED === "1";
  if (organizations > 0 && !reseed) {
    console.log(
      `vercel-build: seed skipped: ${host} already has ${organizations} organizations (set CAREPATH_DEPLOY_RESEED=1 for one deploy to replace them)`,
    );
    return;
  }
  console.log(
    organizations > 0
      ? `vercel-build: CAREPATH_DEPLOY_RESEED=1: replacing the tenant data on ${host} with the small seed`
      : `vercel-build: ${host} has no organizations: loading the small seed`,
  );
  const seed = db(["run", "seed", "--profile", "small", "--anchor", "now"], {
    CAREPATH_ALLOW_REMOTE_SEED: "1",
  });
  if (seed.status !== 0) fatal(`seed failed on ${host} (exit ${seed.status})`);
}

function fatal(message) {
  console.error(`vercel-build: FAILED: ${message}`);
  process.exit(1);
}

// Before the compile step, while every workspace manifest still points at its TypeScript source.
databaseStep();
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

// The project's static output folder (vercel.json "outputDirectory"). Without it Vercel would
// serve the project root, source files included. Every other path is rewritten to the function.
const publicDir = path.join(root, "apps/api/public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, "robots.txt"), "User-agent: *\nDisallow: /\n");
console.log("vercel-build: wrote apps/api/public/robots.txt");
