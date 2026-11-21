# Deploying CarePath to Vercel

CarePath is a demonstration product. Synthetic data only. Not for clinical use. This guide puts the demo on the public internet; it does not make the product fit for real patient data, and nothing here is a compliance claim.

The layout is two Vercel projects built from the one GitHub repository, plus one Neon Postgres database from the Vercel Marketplace:

| Project | Root Directory | What it runs |
|---|---|---|
| `carepath-api` | `apps/api` | The Fastify API as one Vercel Function, with a daily cron call that runs the job queue. |
| `carepath-web` | `apps/web` | The Next.js app. The browser only talks to this origin; `/api/*` is rewritten to the API project (checkpoint C1, section 5.2). |
| Neon (Marketplace) | none | PostgreSQL. Connected to `carepath-api` only; the web project never touches the database. |

Status: the configuration in this repository was checked locally with `scripts/vercel-check.sh` (output in `docs/PROGRESS.md`, section "WP Deploy"). No deployment has been made from it yet, so nothing below is a claim that a live URL works.

## How the pieces fit

- The API entry for Vercel is `apps/api/server.mjs`. Vercel's Fastify preset searches `app`, `index` and `server` files in the project root before `src/`, and takes the first one that imports `fastify`; `server.mjs` is that file. It loads `src/vercel.ts` (compiled), which builds the app and calls `listen()`. Vercel's Node runtime intercepts that call and serves requests through the server it captured.
- The workspace packages export TypeScript source, and the API normally runs through tsx. The build command `pnpm run vercel-build` (`apps/api/scripts/vercel-build.mjs`) compiles every runtime TypeScript file to JavaScript beside itself and points the workspace package manifests at the `.js` files. The layout does not change, so Prisma's query compiler and the Medplum R4 definitions load from the same relative places as in development. The script refuses to run outside a Vercel build or the scratch copy made by `scripts/vercel-check.sh`, because it rewrites files in place.
- The Medplum R4 definition files are read from disk at run time, which the file tracer cannot see, so `apps/api/vercel.json` lists them under `functions["server.mjs"].includeFiles`.
- There is no worker loop on a function. `GET /internal/cron/jobs` does what the loop does: it enqueues the recurring jobs for the current 15-minute slot (deduplicated), then runs due jobs until none are left or `CRON_BUDGET_MS` is spent. It needs `Authorization: Bearer <CRON_SECRET>`; Vercel Cron sends that header itself when the project has a `CRON_SECRET` variable. With `JOBS_INLINE=1`, sending or retrying a message runs that message's delivery job inside the same request, so messages do not wait for the next cron call.
- Session cookies: the API sets `__Host-cp_session` with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` and no `Domain`. Because the browser reaches the API through the web origin's `/api` rewrite, the cookie belongs to the web host. Mutating requests must carry an `Origin` listed in `CORS_ORIGINS` and the CSRF token, so `CORS_ORIGINS` must name the web project's public origin exactly.
- On Vercel the function receives each request from Vercel's runtime over 127.0.0.1, with the visitor address in `X-Forwarded-For`. `TRUST_PROXY=loopback` makes the API read the address from that header only when the socket peer is loopback.
- `src/vercel.ts` sets `NODE_ENV=production` whenever `VERCEL=1`, so every deployment, preview or production, uses the production rules: `SESSION_SECRET` required, Secure `__Host-` cookie, `CAREPATH_FIXED_NOW`, `AI_PROBE` and `MESSAGE_FORCE_FAILURE` ignored.

## Before you start

- A GitHub account with the repository `RDarshanJ/CarePath` pushed, including this branch's files.
- A Vercel account (Hobby is enough; see "Plan limits").
- On your own machine: Node.js 22, pnpm 10.28.0 (`corepack enable` then `corepack prepare pnpm@10.28.0 --activate`), and a clone of the repository with `pnpm install` run once.

Generate two secrets now and keep them somewhere safe:

```bash
openssl rand -base64 32   # SESSION_SECRET
openssl rand -hex 32      # CRON_SECRET (at least 16 characters; hex keeps it header-safe)
```

## Step 1: create the API project

1. In the Vercel dashboard choose **Add New** then **Project**, and import `RDarshanJ/CarePath`.
2. Project name: `carepath-api`.
3. **Root Directory**: click **Edit** and choose `apps/api`. Leave "Include files outside the root directory in the Build Step" enabled (the default); the build needs `packages/`.
4. **Framework Preset**: Fastify. `apps/api/vercel.json` also sets `"framework": "fastify"`.
5. **Build and Output Settings**: leave the overrides off. `apps/api/vercel.json` sets them:
   - Install Command: `pnpm install --frozen-lockfile --filter @carepath/api...`
   - Build Command: `pnpm run vercel-build`
   - Output Directory: not used by the Fastify preset.
6. **Environment Variables**: add the variables from "API project variables" below, except `CORS_ORIGINS`, which needs the web domain (step 4). Use a temporary value such as `https://carepath-web.vercel.app` if you expect that name, and correct it later.
7. Click **Deploy**. The first deployment will report database errors on `/health` until step 2 and step 3 are done; that is expected.
8. After it builds, open **Settings**, then **General**, and set **Node.js Version** to `22.x` to match local development.

## Step 2: add Neon from the Marketplace

1. In the `carepath-api` project open **Storage** (or the team's **Marketplace**), choose **Neon**, and create a database on the free plan. Pick a region close to the Vercel function region (the default function region is `iad1`, US East).
2. When asked which projects to connect, choose `carepath-api` only, for Production and Preview. Leave the custom prefix empty.
3. The integration adds these variables to the project. CarePath uses two of them:

| Variable | Kind | Used for |
|---|---|---|
| `DATABASE_URL` | pooled (PgBouncer) | The API at run time. |
| `DATABASE_URL_UNPOOLED` | direct | Migrations and the seed, from your machine. |
| `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGHOST_UNPOOLED`, `POSTGRES_*`, `NEON_PROJECT_ID` | various | Not used. |

4. Redeploy `carepath-api` (**Deployments**, the latest one, **Redeploy**) so the function sees `DATABASE_URL`.

## Step 3: migrate and seed the Neon database

Run these on your own machine from the repository root. Copy the `DATABASE_URL_UNPOOLED` value from the Neon dashboard or from **Settings**, **Environment Variables** in `carepath-api` (or run `vercel env pull` after `vercel link`). Use the direct (unpooled) string for both commands.

```bash
export DATABASE_URL='postgresql://...@ep-...neon.tech/neondb?sslmode=require'   # DATABASE_URL_UNPOOLED

# Apply every migration in packages/db/prisma/migrations (WebAssembly schema engine, no binary download).
pnpm db:migrate

# Load the synthetic demo world, with "now" at the current hour so "today" matches the real clock.
# The seed deletes all tenant data first; it refuses a non-local host unless this flag is set.
CAREPATH_ALLOW_REMOTE_SEED=1 pnpm db:seed --profile small --anchor now
```

The demo logins in `docs/demo-accounts.md` then work against the deployed API, all with the password listed there. Run the seed again whenever you want to reset the demo; it replaces the tenant data each time. `--anchor now` matters here: production ignores `CAREPATH_FIXED_NOW`, so a seed at the fixed default anchor (2026-11-19 16:00 UTC) would leave "today" and "due" in the past.

The build sandbox this repository was prepared in cannot reach Neon (no DNS for `*.neon.tech`, and its proxy refuses the connection), so these two commands have not been run against a Neon database from there. They are the same commands `pnpm verify` runs against the local cluster.

## Step 4: create the web project

1. **Add New**, **Project**, import `RDarshanJ/CarePath` again.
2. Project name: `carepath-web`.
3. **Root Directory**: `apps/web`. Leave "Include files outside the root directory" enabled.
4. **Framework Preset**: Next.js. `apps/web/vercel.json` sets:
   - Install Command: `pnpm install --frozen-lockfile --filter @carepath/web...`
   - Build Command: `pnpm run build` (which is `next build --webpack`; the workspace packages are consumed as TypeScript source and only webpack maps `./x.js` imports to `./x.ts`)
   - Output Directory: the Next.js default (`.next`).
5. **Environment Variables**: see "Web project variables". `API_ORIGIN` is read at build time for the `/api` rewrite and at run time by server components, so set it for Production and Preview before the first build.
6. **Deploy**, then set **Node.js Version** to `22.x`.
7. Note the production domain Vercel gives the project (for example `https://carepath-web.vercel.app`; Vercel adds a suffix if the name is taken).

## Step 5: connect the two projects

1. In `carepath-api`, set `CORS_ORIGINS` to the exact web origin from step 4, with no trailing slash, for example `https://carepath-web.vercel.app`. Add a custom domain here too if you add one later, separated by a comma.
2. Redeploy `carepath-api`.
3. If the API's production domain differs from what you entered as `API_ORIGIN`, correct `API_ORIGIN` in `carepath-web` and redeploy it. The rewrite destination is fixed at build time, so a changed `API_ORIGIN` always needs a new web build.
4. Check: open `https://<api domain>/health`; it should answer `{"status":"ok","checks":{"database":"ok"}}`. Then sign in on the web domain as `patient.demo@carepath.test`.

## Step 6: cron

`apps/api/vercel.json` declares one cron job:

```json
"crons": [{ "path": "/internal/cron/jobs", "schedule": "17 6 * * *" }]
```

Vercel registers it on the next production deployment of `carepath-api` and calls `GET /internal/cron/jobs` once a day between 06:00 and 06:59 UTC, with `Authorization: Bearer <CRON_SECRET>`. Cron jobs run only on production deployments. You can trigger a pass by hand from **Settings**, **Cron Jobs**, **Run**, or with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<api domain>/internal/cron/jobs
```

The answer lists `enqueued`, `claimed`, `succeeded`, `retried`, `dead` and `complete` (false when the time budget ran out and jobs remain).

On Hobby the cron can run at most once a day (see "Plan limits"). Message delivery does not depend on it (`JOBS_INLINE=1`), but the time-based review rules, session abandonment and appointment reminders run only when a pass runs. For a more frequent pass without a paid plan, any external scheduler that can send the header works, for example a scheduled GitHub Actions workflow calling the `curl` line above with `CRON_SECRET` stored as a repository secret. That is not set up in this repository.

## API project variables (`carepath-api`)

Set for Production and Preview. Secret values are marked; mark them **Sensitive** in Vercel.

| Variable | Example | Secret | Notes |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require` | yes | Added by the Neon integration (pooled). |
| `DATABASE_URL_UNPOOLED` | `postgresql://neondb_owner:...@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require` | yes | Added by the Neon integration. Not read by the API; use it for migrate and seed. |
| `SESSION_SECRET` | output of `openssl rand -base64 32` | yes | HMAC key for CSRF tokens and address hashes. The API refuses to start in production with the development default. Changing it signs everyone out. |
| `CRON_SECRET` | output of `openssl rand -hex 32` | yes | At least 16 characters in production. Without it the cron route refuses every call. |
| `CORS_ORIGINS` | `https://carepath-web.vercel.app` | no | Exact web origin(s), comma-separated. Used for CORS and for the Origin check on every mutating request. |
| `TRUST_PROXY` | `loopback` | no | Vercel's runtime forwards each request from 127.0.0.1 with the visitor address in `X-Forwarded-For`. |
| `JOBS_INLINE` | `1` | no | Deliver messages inside the send and retry requests. |
| `CRON_BUDGET_MS` | `45000` | no | Optional. Time budget for one cron pass; keep it under the function's `maxDuration` (60 s in `vercel.json`). |
| `AI_PROVIDER` | `deterministic` | no | Optional; this is the default. The deterministic provider is rule-based demo output, not a live model. |
| `LOG_LEVEL` | `info` | no | Optional. |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | no | Optional. Makes the build use the `packageManager` pin (`pnpm@10.28.0`) instead of the pnpm version Vercel picks from the lockfile. |

Do not set:

- `NODE_ENV`. Vercel sets it, `src/vercel.ts` forces `production` on Vercel, and `NODE_ENV=production` during install would skip the dev dependencies the build needs.
- `CAREPATH_FIXED_NOW`, `AI_PROBE`, `MESSAGE_FORCE_FAILURE`. They are test hooks and are ignored in production; leave them unset so the configuration says what runs.
- `API_PORT`, `API_HOST`, `JOBS_WORKER`. Not used on Vercel.

## Web project variables (`carepath-web`)

| Variable | Example | Secret | Notes |
|---|---|---|---|
| `API_ORIGIN` | `https://carepath-api.vercel.app` | no | The API project's production origin, no trailing slash. Baked into the `/api` rewrite at build time and read by server components at run time. |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | no | Optional, as for the API. |

The web project needs no database variable and no secret.

## Redeploying

- A push to the production branch builds both projects. Vercel skips a project whose files and internal dependencies did not change.
- After changing an environment variable, redeploy that project (**Deployments**, latest, **Redeploy**). Variables are read at build time by the web project and at start-up by the API.
- After a change under `packages/db/prisma/migrations`, run `pnpm db:migrate` against `DATABASE_URL_UNPOOLED` from your machine before or right after the API deploys.
- To reset the demo data, run the seed command from step 3 again.

## Checking the configuration locally

```bash
scripts/vercel-check.sh        # both projects; or `api` or `web`
```

For the API it copies the checkout, runs the install and build commands from `apps/api/vercel.json`, traces `server.mjs` with `@vercel/nft` (the tracer Vercel's Node builder uses) plus the `includeFiles`, copies only the traced files into an empty folder, and loads that copy the way Vercel's Node runtime does, with `NODE_ENV=production` against its own migrated and seeded local database. It then checks health, sign-in cookies, the Origin check, a scoped read, the FHIR export (Medplum files), inline message delivery, logout with CSRF, and the cron route with and without the secret. For the web project it runs `next build --webpack` with an `https` `API_ORIGIN` and checks the rewrite in the build output. It deploys nothing and cannot prove that Vercel's own build behaves the same way.

## Known limitations

- Rate limits are in memory, per function instance (`apps/api/src/core/http.ts`). On Vercel several instances can run at once and an instance can be replaced at any time, so the limits are per instance and reset on a new instance, not global. Sign-in limits are keyed on the address the API sees; Vercel documents forwarding the visitor address on external rewrites, but if a hop replaced it, every sign-in through the web origin would share one bucket.
- Cold starts: the first request to a new instance loads the app (about half a second in the local check), and a free Neon database that has scaled to zero adds its own wake-up delay. The FHIR export loads the R4 definitions on first use in each instance.
- Cron frequency: once a day on Hobby, with the start time anywhere within the scheduled hour. Review rules based on time, session abandonment and appointment reminders lag accordingly.
- Preview deployments of the web project have their own origins, which are not in `CORS_ORIGINS`, so signing in on a preview fails the Origin check unless you add that origin. Previews of the API share the production database unless Neon preview branching is enabled.
- `apps/api/vercel.json` caps the function at 60 seconds; Hobby allows up to 300 seconds.
- The AI features use the deterministic demo provider. Configuring a live model is outside this guide.
- This is a demonstration with synthetic data. It is not for clinical use and must not hold real patient information.

## Plan limits (Vercel Hobby, checked November 2026)

| Item | Hobby | Needs Pro for |
|---|---|---|
| Cron jobs | Once a day at most, hourly precision. A more frequent schedule fails the deployment. | Schedules down to once a minute. |
| Function duration | Default and maximum 300 s with Fluid compute. | Up to 800 s. |
| Function bundle | 250 MB. The traced API function is about 47 MB. | Not needed. |

Hobby is for personal, non-commercial use. Neon's free plan is enough for the small seed profile.
