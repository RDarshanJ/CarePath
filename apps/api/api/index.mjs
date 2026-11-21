// Vercel Function entry for the API (docs/deployment.md). Not used by `pnpm start`.
//
// Vercel builds every file in api/ as a Node function; vercel.json rewrites all paths to /api
// and configures this file under `functions`. Vercel's Node runtime captures the server that
// src/vercel.js starts with listen(). `pnpm run vercel-build` compiles the TypeScript sources to
// JavaScript next to themselves, which creates ../src/vercel.js.
import "../src/vercel.js";
