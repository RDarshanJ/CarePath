# WP 2.4 API core: decisions and deviations

Date: 2026-11-19. Scope: `apps/api` core (auth, request context, scoped repositories, error envelope, audit, rate limiting, OpenAPI, job runner) and the role permission keys. Applies ADR-2, ADR-4, ADR-7, ADR-8, advisor plan revision 1 (access rule) and PRD sections 5 and 13. Items marked "for C1" need the advisor's decision at checkpoint C1.

## 1. New dependencies (for C1)

All exact-pinned in `apps/api/package.json`.

| Package | Version | Kind | Why | Plan basis |
|---|---|---|---|---|
| `zod` | 4.6.7 | runtime | Request and response schemas | ADR-2 |
| `fastify-type-provider-zod` | 7.0.0 | runtime | Zod validation and serialization in Fastify, OpenAPI transform | ADR-2 (named) |
| `@fastify/swagger` | 9.9.5 | runtime | Builds the OpenAPI document from route schemas | ADR-2 ("OpenAPI generated from the same schemas"); peer of the type provider |
| `@fastify/rate-limit` | 11.2.2 | runtime | In-memory rate limiting | ADR-4 (named) |
| `@fastify/cookie` | 11.1.5 | runtime | Cookie parsing and `Set-Cookie` | Not named. Hand-rolled cookie parsing was the alternative. |
| `@fastify/cors` | 11.4.3 | runtime | CORS allow-list with credentials | Not named. Requested by the WP 2.4 task. |
| `openapi-types` | 12.1.3 | runtime (types only) | Peer dependency of the type provider | Follows from the above |
| `@apidevtools/swagger-parser` | 13.1.0 | dev | Validates the generated document in tests and `pnpm openapi:check` | Not named |

`@carepath/db` and `@carepath/shared` are workspace dependencies. No other service or datastore was added.

## 2. Authentication and sessions (ADR-7)

- Database sessions in `AuthSession`. The cookie holds 32 random bytes; the table stores SHA-256 of it. Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 12 hours; `Secure` and the `__Host-` name prefix when `NODE_ENV=production` or `COOKIE_SECURE=true`.
- Timeouts per PRD section 13: 30 minutes idle (from `lastSeenAt`) and 12 hours absolute (`expiresAt`). `lastSeenAt` is written at most once a minute, so the idle window has up to 60 seconds of slack. An expired or idle session is revoked on first sight and the cookie is cleared; the response code is `session_expired`.
- Rotation: login always creates a new session and revokes any session cookie sent with the login request.
- Password hashing uses `@carepath/shared/password` (scrypt, `scrypt$N$r$p$salt$hash`, N=16384), written by the WP 2.6 worker for the seed. The API does not have its own hasher. Unknown emails still pay for one scrypt run so response time does not reveal which accounts exist.
- An account in more than one organization must send `organizationSlug`; without it login answers 400 `organization_required` after the password check.

## 3. CSRF and CORS

- ADR-7 names an Origin check. WP 2.4 adds a second layer: a stateless synchronizer token, `HMAC-SHA256(SESSION_SECRET, "csrf:" + sessionId)`, returned by login and `GET /auth/session`, required in `x-csrf-token` on every POST, PUT, PATCH and DELETE made with a session. No schema change was needed.
- The Origin check runs on every mutating request, including login (login CSRF). A request with neither `Origin` nor `Referer` is refused. Browsers always send `Origin` on POST; scripts and load tools must send one from `CORS_ORIGINS`.
- CORS is an exact-match allow-list from `CORS_ORIGINS` (default `http://127.0.0.1:3000,http://localhost:3000`), with credentials, never `*`.

## 4. Authorization (ADR-8, PRD section 5)

- Permission keys and the role matrix live in `apps/api/src/core/authz/permissions.ts`. Migration `20261120120000_role_permissions` writes the same lists into `Role.permissions`; a test asserts they are equal. The migration is hand-written because `schema-engine.ts create` only produces schema diffs and this change is data only (domain model section 8 allows hand-written raw SQL migrations).
- The map follows PRD section 5. Two readings to confirm at C1: coordinators get `metrics.read` (PRD section 4.3 lists Metrics in the shared coordinator and admin shell), and admins get `enrollment.manage` and `assignment.manage` (same section).
- Routes declare access in `config.access`. Deny by default: a route without `auth: "public"` needs a session (401).
- Status codes:
  - Missing route permission: 403 `forbidden` plus `security.access_denied` with `detailCode = missing_permission`.
  - Object out of scope (another organization, another patient's id for the patient role, or no such id): 404 with a byte-identical body plus `security.access_denied` with `detailCode = out_of_scope`, `resourceType` and the requested `resourceId`. `patientId` stays empty because the id may belong to another organization (composite foreign key).
  - Clinical write by a clinician who is not on the patient's active care team: 403 `not_on_care_team` plus an event. The patient is readable to that clinician (revision 1 access rule), so a 404 would be false.
- The request id is returned in the `x-request-id` header only, so the AC-I6 404 bodies are identical byte for byte. Client-supplied request ids are ignored.
- `GET /patients/:patientId` (patient header, writes `phi.read`) ships as the first patient-scoped route so Scenario I is testable now. Care-team write scope is exercised through a test-only fixture route until WP 3.1 adds real clinical writes; `requirePatientWrite(request, patientId, { careTeamOnly: true })` is the call those routes use.

## 5. Audit

- `AuditWriter.fromRequest` fills actor, organization, request id, HMAC of the client IP, route template and method. `metadata` takes short scalars only; callers never pass bodies, names or raw URLs (AC-I7).
- Deviation (for C1): the schema check `AuditEvent_user_actor_check` requires `actorUserId` when `actorType = 'user'`. A failed login for an unknown email has no user, so it is recorded with `actorType = 'system'` and `metadata.anonymous = true`. Suggested fix: add `anonymous` to the `AuditActorType` enum.
- Audit writes are awaited. If one fails, the request fails with 500 instead of serving unaudited PHI.

## 6. Errors, logging and headers

- One envelope: `{ "error": { "code", "message", "details"? } }`. Messages are fixed per code. Validation details carry the field path and Zod issue code only, never the received value. 500 responses never include the cause.
- Logs: Fastify's per-request lines are off (`LogController`). One allow-listed line per request: request id, method, route template, status, duration, actor id, organization id. Errors are logged as type, code and stack frames, never the message, because database and library messages can quote values. `redact` is a backstop. A canary test sends a patient name, check-in text, a pain value, an email and a password through the API and asserts none appear in the captured log.
- Response headers on every reply: `nosniff`, `no-referrer`, `X-Frame-Options: DENY`, a `default-src 'none'` CSP, `Cache-Control: no-store`. No `@fastify/helmet`.

## 7. Rate limiting (ADR-4)

- `@fastify/rate-limit` in memory, per process. Global default 300 requests per minute per IP (an assumption; `RATE_LIMIT_GLOBAL_PER_MINUTE`).
- Login: 10 per minute per account and IP (PRD section 13), keyed on the IP HMAC and a hash of the normalised email, evaluated after body validation. 429 carries `Retry-After` and the error envelope.
- The AI, export, import and booking limits in PRD section 13 belong to the routes added in WP 4.1, 5.2 and 5.4.

## 8. OpenAPI (ADR-2)

- OpenAPI 3.1 generated from the route schemas, served at `GET /docs/openapi.json` (public, hidden from the document itself).
- `pnpm openapi:check` validates the document with `@apidevtools/swagger-parser`, requires an operationId, tag and summary on every operation and the `ErrorEnvelope` schema on every 4xx response, and fails when `apps/api/openapi.json` is out of date (`pnpm --filter @carepath/api openapi:write` regenerates it). The generated file is excluded from Prettier so its bytes are owned by the script.

## 9. Job runner (ADR-4)

- `Job` rows claimed with `UPDATE ... WHERE id IN (SELECT ... FOR UPDATE SKIP LOCKED LIMIT n)`. The attempt counter is incremented at claim time, so a crash counts as an attempt.
- Failure: back to `queued` with `runAt` pushed out by 1 s doubling, capped at 5 minutes; on the last attempt the job moves to `dead`, which is the dead-letter state. `requeueDead` moves it back to `queued` with attempts reset.
- A job left `running` by a crashed worker is recovered after 5 minutes, only by workers that handle its queue.
- `lastError` stores only the error type and code, unless the handler throws `JobError` with a message it knows is safe. Library messages can quote patient data.
- The worker loop runs inside the API process (`JOBS_WORKER=off` disables it). `pnpm jobs:drain` runs due jobs to completion. The handler registry (`apps/api/src/jobs/handlers.ts`) is empty until WP 4.1 adds reminders; the runner only claims queues it has handlers for.

## 10. Other deviations

- Zod contracts for the API (login, session, error envelope, patient header) live in `apps/api` for now, not `packages/shared`. During this WP the WP 2.6 worker had uncommitted changes to `packages/shared/package.json`, and `packages/shared` has no `zod` dependency yet. Move them when the web app first needs them.
- `pnpm --filter @carepath/api start` runs `tsx src/server.ts`. `node dist/server.js` fails because `@carepath/db` exports TypeScript source whose generated Prisma client is imported with `.js` specifiers (ERR_MODULE_NOT_FOUND). `pnpm build` still runs `tsc` for apps/api. Packaging `@carepath/db` for plain Node is open.
- `scripts/gate-wp-2.4.sh` stops Postgres only if it started it, so a concurrent worker's database is not stopped mid-run. `pnpm verify` still stops it at the end.
- Not done in this WP: an audit viewer endpoint (WP 6.1), the per-route enumeration test of AC-I1 across every patient-scoped route (needs the WP 3.1 routes; the OpenAPI document is in place for it), Postgres role with INSERT and SELECT only on `AuditEvent`, MFA and account lockout beyond rate limiting.
