#!/usr/bin/env node
/**
 * Loads an API function the way Vercel's Node runtime does and drives it over HTTP. Used by
 * scripts/vercel-check.sh against the traced function files, not against the source tree.
 *
 * Vercel (packages/node/src/serverless-functions/serverless-handler.mts) stubs
 * http.Server.prototype.listen while it imports the entry, keeps the server that called it, waits
 * up to one second for that call, then listens on 127.0.0.1 with a random port and proxies each
 * request to it with the visitor headers. This file repeats those steps.
 *
 * Usage: node vercel-harness.mjs <entry.mjs>   (DATABASE_URL, CRON_SECRET, CORS_ORIGINS set)
 */
import http from "node:http";
import { pathToFileURL } from "node:url";

const entry = process.argv[2];
if (!entry) {
  console.error("usage: vercel-harness.mjs <entry>");
  process.exit(2);
}

let server = null;
let found = () => {};
const originalListen = http.Server.prototype.listen;
http.Server.prototype.listen = function stubbedListen() {
  // eslint-disable-next-line @typescript-eslint/no-this-alias -- the captured server, as Vercel keeps it
  server = this;
  http.Server.prototype.listen = originalListen;
  found();
  return this;
};
const started = Date.now();
await import(pathToFileURL(entry).href);
if (!server) {
  await new Promise((resolve) => {
    found = resolve;
    setTimeout(resolve, 1_000);
  });
}
http.Server.prototype.listen = originalListen;
if (!server) {
  console.error("harness: the entry never called listen(); Vercel would fail the same way");
  process.exit(1);
}
await new Promise((resolve) => originalListen.call(server, 0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`harness: entry loaded and server captured in ${Date.now() - started} ms`);

const origin = (process.env.CORS_ORIGINS ?? "").split(",")[0];
const visitor = { "x-forwarded-for": "203.0.113.7", "x-forwarded-proto": "https" };
const failures = [];
async function step(name, fn) {
  try {
    const detail = await fn();
    console.log(`ok   ${name}${detail ? `: ${detail}` : ""}`);
  } catch (err) {
    failures.push(name);
    console.log(`FAIL ${name}: ${err.message}`);
  }
}
function expectStatus(res, status) {
  if (res.status !== status) throw new Error(`status ${res.status}, expected ${status}`);
}

let cookie = "";
let csrf = "";
let patientId = "";
await step("GET /health", async () => {
  const res = await fetch(`${base}/health`, { headers: visitor });
  expectStatus(res, 200);
  return JSON.stringify(await res.json());
});
await step("POST /auth/login with the web origin", async () => {
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { ...visitor, origin, "content-type": "application/json" },
    body: JSON.stringify({ email: "patient.demo@carepath.test", password: "CarePath-Demo-2026" }),
  });
  expectStatus(res, 200);
  const setCookie = res.headers.get("set-cookie") ?? "";
  for (const want of ["__Host-cp_session=", "Secure", "HttpOnly", "SameSite=Lax", "Path=/"]) {
    if (!setCookie.includes(want)) throw new Error(`Set-Cookie lacks ${want}: ${setCookie}`);
  }
  if (/Domain=/i.test(setCookie)) throw new Error("Set-Cookie names a Domain");
  cookie = setCookie.split(";")[0];
  const body = await res.json();
  csrf = body.csrfToken;
  return "Set-Cookie is __Host-, Secure, HttpOnly, SameSite=Lax, Path=/, host-only";
});
await step("POST /auth/login from another origin is refused", async () => {
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { ...visitor, origin: "https://evil.example", "content-type": "application/json" },
    body: "{}",
  });
  expectStatus(res, 403);
});
await step("GET /auth/session with the cookie", async () => {
  const res = await fetch(`${base}/auth/session`, { headers: { ...visitor, cookie } });
  expectStatus(res, 200);
  const body = await res.json();
  patientId = body.user?.patientId ?? body.patientId ?? body.membership?.patientId ?? "";
  return `role ${body.user?.role ?? body.role ?? "unknown"}`;
});
await step("GET /patients/:id/today (Prisma query compiler, scoped repositories)", async () => {
  const res = await fetch(`${base}/patients/${patientId}/today`, {
    headers: { ...visitor, cookie },
  });
  expectStatus(res, 200);
});
await step("GET /patients/:id/fhir/export (Medplum R4 definitions on disk)", async () => {
  if (!patientId) throw new Error("no patient id in the session response");
  const res = await fetch(`${base}/patients/${patientId}/fhir/export`, {
    headers: { ...visitor, cookie },
  });
  expectStatus(res, 200);
  return `${(await res.json()).entry?.length ?? 0} entries`;
});
await step("POST /conversations/:id/messages is delivered inline (JOBS_INLINE=1)", async () => {
  const list = await fetch(`${base}/conversations`, { headers: { ...visitor, cookie } });
  expectStatus(list, 200);
  const conv = (await list.json()).items?.[0];
  if (!conv) throw new Error("no conversation for the demo patient");
  const res = await fetch(`${base}/conversations/${conv.id}/messages`, {
    method: "POST",
    headers: {
      ...visitor,
      cookie,
      origin,
      "x-csrf-token": csrf,
      "content-type": "application/json",
    },
    body: JSON.stringify({ body: "Deployment check message." }),
  });
  expectStatus(res, 201);
  const message = await res.json();
  if (message.status !== "sent") throw new Error(`message status ${message.status}`);
  return "status sent in the response";
});
await step("POST /auth/logout with CSRF token", async () => {
  const res = await fetch(`${base}/auth/logout`, {
    method: "POST",
    headers: {
      ...visitor,
      cookie,
      origin,
      "x-csrf-token": csrf,
      "content-type": "application/json",
    },
    body: "{}",
  });
  if (res.status !== 200 && res.status !== 204) throw new Error(`status ${res.status}`);
});
await step("GET /internal/cron/jobs without the secret is refused", async () => {
  const res = await fetch(`${base}/internal/cron/jobs`, { headers: visitor });
  expectStatus(res, 401);
});
await step("GET /internal/cron/jobs with Authorization: Bearer CRON_SECRET", async () => {
  const res = await fetch(`${base}/internal/cron/jobs`, {
    headers: { ...visitor, authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  expectStatus(res, 200);
  return JSON.stringify(await res.json());
});

server.close();
server.closeAllConnections?.();
if (failures.length) {
  console.log(`harness: ${failures.length} failed: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("harness: all checks passed");
process.exit(0);
