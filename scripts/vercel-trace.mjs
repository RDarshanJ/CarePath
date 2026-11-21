#!/usr/bin/env node
/**
 * Traces the files a Vercel Function for the API would contain, with the same tracer Vercel's
 * Node builder uses (@vercel/nft, here the copy compiled into Next.js), then copies them into an
 * empty folder so the function can be run without the rest of the checkout.
 * Used by scripts/vercel-check.sh.
 *
 * Usage: node vercel-trace.mjs <repo root> <entry relative to root> <output dir> [include globs...]
 * Include globs are relative to TRACE_WORK_DIR (the Vercel project root) or the entry's folder.
 */
import { cpSync, globSync, lstatSync, mkdirSync, readlinkSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [root, entry, out, ...includes] = process.argv.slice(2);
if (!root || !entry || !out) {
  console.error("usage: vercel-trace.mjs <root> <entry> <out> [include globs...]");
  process.exit(2);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../apps/web/package.json"));
const { nodeFileTrace } = require("next/dist/compiled/@vercel/nft");

// Vercel resolves includeFiles against the project root, which TRACE_WORK_DIR names when the
// entry sits in a subfolder (api/index.mjs).
const workPath = path.join(root, process.env.TRACE_WORK_DIR ?? path.dirname(entry));
const { fileList, warnings } = await nodeFileTrace([path.join(root, entry)], {
  base: root,
  processCwd: workPath,
  ts: true,
  mixedModules: true,
});
const files = new Set(fileList);
for (const pattern of includes) {
  for (const match of globSync(pattern, { cwd: workPath })) {
    files.add(path.relative(root, path.join(workPath, match)));
  }
}

let bytes = 0;
for (const rel of [...files].sort()) {
  const from = path.join(root, rel);
  const to = path.join(out, rel);
  mkdirSync(path.dirname(to), { recursive: true });
  const st = lstatSync(from);
  if (st.isSymbolicLink()) symlinkSync(readlinkSync(from), to);
  else if (st.isFile()) {
    cpSync(from, to);
    bytes += st.size;
  }
}
const real = [...warnings].filter((w) => !/Failed to resolve dependency/.test(String(w)));
console.log(
  `vercel-trace: ${files.size} files, ${(bytes / 1024 / 1024).toFixed(1)} MiB, ${real.length} warnings`,
);
for (const w of real.slice(0, 10)) console.log(`  warning: ${String(w.message ?? w)}`);
