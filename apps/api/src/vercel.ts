/**
 * Vercel Function entry for the API (docs/deployment.md). `apps/api/server.mjs` loads the
 * compiled copy of this file that `scripts/vercel-build.mjs` writes during the Vercel build.
 *
 * Vercel's Node runtime stubs `http.Server.prototype.listen` while it imports the entry, keeps
 * the server that calls it, and serves requests through it from 127.0.0.1 (so TRUST_PROXY=loopback
 * reads the visitor address from X-Forwarded-For). The stubbed call never completes, so the
 * listen promise is not awaited. Outside Vercel the same call really listens, which keeps this
 * file runnable with `tsx src/vercel.ts` for a local check.
 *
 * Unlike src/server.ts there is no worker loop and no 15-minute scheduler: nothing may run
 * between requests on a function. GET /internal/cron/jobs does that work (Vercel Cron), and
 * JOBS_INLINE=1 delivers messages inside the request that sent them.
 */
import { buildApp } from "./app.js";
import { clockFromEnv } from "./core/clock.js";

// Every Vercel deployment, preview or production, runs with production rules: Secure __Host-
// cookie, required SESSION_SECRET, test hooks and CAREPATH_FIXED_NOW ignored.
if (process.env["VERCEL"] === "1") process.env["NODE_ENV"] = "production";

const clock = clockFromEnv(process.env);
const app = await buildApp({ now: clock.now });
if (clock.warning) app.log.warn(clock.warning);

app
  .listen({ port: Number(process.env["PORT"] ?? 3000), host: "127.0.0.1" })
  .catch((err: unknown) => {
    app.log.error({ err }, "failed to start");
    process.exit(1);
  });
