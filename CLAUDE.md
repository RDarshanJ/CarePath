# CarePath: working rules

CarePath is a demonstration digital physical-therapy platform. Synthetic data only. Not for clinical use.
Authority order: `docs/decisions/advisor-plan.md` overrides `docs/BRIEF.md` where they differ.

## Architecture rules

- pnpm workspaces only: `apps/web` (Next.js App Router, route groups `(patient) (clinician) (admin) (public)`), `apps/api` (Fastify 5), `packages/{db,ui,ai,fhir,shared,config}`.
- `packages/shared` holds Zod contracts used by both apps. Schema and shared contracts are owned by one worker at a time; UI work consumes them and never edits them.
- Modular monolith. No Redis, BullMQ, Turborepo, Python service, or extra deployables (ADR-1..4).
- PostgreSQL 16 + Prisma. Constraints Prisma cannot express go in raw SQL migrations. Booking integrity is enforced by DB exclusion constraints, not application checks.
- Isolation lives in scoped repositories: repos take `ctx` and always filter on `orgId`. Only `repo.ts` files (and `packages/db`) may import `@prisma/client`; ESLint enforces it.
- Care plan versions, notes and AI reviews are append-only. All timestamps UTC.
- Pin exact dependency versions (no `^`/`~`). No new dependency or service without advisor approval.

## Design principles

- Follow advisor plan section 4: one token set, two themes via `data-theme`, self-hosted fonts, no gradients, no purple, no glass, never colour alone for status.
- In `apps/web`, ESLint bans raw colour values and Tailwind arbitrary values (`bg-[#fff]`, `w-[13px]`); use token utilities from `@carepath/ui`. Only the `/design-system` gallery is exempt.
- No dead buttons, fake charts, hardcoded interactions, or placeholder text. A route with no working action is removed, not stubbed.
- Every app shell shows "Demonstration product. Synthetic data. Not for clinical use."

## Commands

- Install: `pnpm install`
- Typecheck / lint / test / build: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
- Format: `pnpm format`
- Database (native PostgreSQL 16, port 54329, data in `.data/pg`): `scripts/db.sh start|stop|reset|status|acquire|release|drop`. Many workers share one cluster. Gates never call `stop` or `reset`; they take a lease (`acquire`) and release it on exit. `stop` and `reset` refuse while a live lease exists (exit 3) unless `--force`. The database named `carepath` is for hand use by the orchestrator; every gate works in its own database.
- Gate environment: `source scripts/gate-env.sh <name> <api_port> [web_port]` sets `DB_LEASE_PID`, `CAREPATH_DB=carepath_<name>_<pid>`, `DATABASE_URL`, `API_PORT`, `WEB_PORT` and `CORS_ORIGINS`, acquires the lease, and on exit drops that database and releases the lease. Every `scripts/gate-wp-*.sh` and `scripts/verify.sh` starts this way.
- Ports (never 3000 or 4000 in a gate): `pnpm verify` API 4090 and web 3090; WP 3.1 API 4031; WP 3.2 API 4032 and web 3032; WP 3.3 API 4033 and web 3033.
- Seed: `pnpm db:seed [--profile small|full] [--anchor now] [--check]` replaces all tenant data in the current `DATABASE_URL` with deterministic synthetic data (demo logins in `docs/demo-accounts.md`). Run `pnpm db:migrate` first on a fresh database.
- Web: no `next dev`. The web build, `next start` and Playwright share `apps/web/.next`, so they run under `scripts/with-web-lock.sh`. Next rewrites `/api/*` to the API at build time from `API_PORT` (or `API_ORIGIN`), so build with the same `API_PORT` the servers will use.
- End-to-end stage: `scripts/e2e.sh` (inside a gate environment, under the web lock) starts the API with `CAREPATH_FIXED_NOW` set to the seed anchor and `next start`, then runs Playwright with axe on system Chrome (`PLAYWRIGHT_CHROME_PATH`, default `/usr/bin/google-chrome`). The tests fix the browser clock to the same instant.
- Full gate: `pnpm verify` (lease and own database, migrate, seed, typecheck, lint, tests, build, end-to-end). Run it from a stopped or shared cluster; it never stops a cluster someone else leased. Work package gates (`scripts/gate-wp-*.sh`) lint, type-check and test only the paths the package owns.
- Commits name paths explicitly (never `git add -A`). A dependency change is its own commit, made right after `pnpm install`.
- No Docker daemon in the build environment: `docker-compose.yml` is unverified.
- Servers do not survive between turns. Every gate is one command that starts what it needs, tests, and tears down.

## Testing conventions

- API tests use Fastify `app.inject()`; no listening server.
- A work package is complete only when its gate command exits 0 and real output is pasted into `docs/PROGRESS.md`.

## Product constraints and honesty rules

- Never claim HIPAA compliance/readiness, clinical validation, live-model output from the deterministic provider, official FHIR validation, Synthea runs, working Compose/deployment, or any participant/usability result. See advisor plan section 6 for the full list.
- Any metric in docs must come from `docs/evaluation/metrics.json` (produced by a recorded run). Targets are written as targets.

## Documentation conventions

- ADRs and plans in `docs/decisions/`; progress in `docs/PROGRESS.md` (completed / outstanding / blockers); do not edit `docs/research/` or the advisor plan.
- Plain sentences, no exclamation marks, no placeholder text.
