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
- No dead buttons, fake charts, hardcoded interactions, or placeholder text. A route with no working action is removed, not stubbed.
- Every app shell shows "Demonstration product. Synthetic data. Not for clinical use."

## Commands

- Install: `pnpm install`
- Typecheck / lint / test / build: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
- Format: `pnpm format`
- Database (native, port 54329, data in `.data/pg`): `scripts/db.sh start|stop|reset|status`
- Full gate: `pnpm verify` (db start, typecheck, lint, tests, build, teardown). Stages not yet implemented print as SKIPPED with the WP that adds them.
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
