// Vercel Function entry for the API (docs/deployment.md). Not used by `pnpm start`.
//
// Vercel's Fastify preset looks for app, index or server files in the project root before src/,
// and takes the first one that imports "fastify"; this file is that match. The import below is
// what the detection reads. `pnpm run vercel-build` compiles the TypeScript sources to
// JavaScript next to themselves, which creates ./src/vercel.js.
import "fastify";
import "./src/vercel.js";
