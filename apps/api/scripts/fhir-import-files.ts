/**
 * Imports FHIR Bundle files into the database at DATABASE_URL through the real import endpoint
 * (app.inject, no listening server), signed in as the seeded clinic admin of organization 1
 * (docs/demo-accounts.md), and prints the outcome per file. Used by `pnpm synthea:demo`.
 *   tsx scripts/fhir-import-files.ts <bundle.json>...
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildApp } from "../src/app.js";

const ORIGIN = "http://127.0.0.1:3000";
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: fhir-import-files.ts <bundle.json>...");
  process.exit(2);
}

const app = await buildApp({ config: { logLevel: "silent", allowedOrigins: [ORIGIN] } });
let failed = false;
try {
  const login = await app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { origin: ORIGIN },
    payload: { email: "admin.demo@carepath.test", password: "CarePath-Demo-2026" },
  });
  if (login.statusCode !== 200) throw new Error(`login failed: ${login.statusCode}`);
  const cookie = login.cookies.find((c) => c.name === "cp_session")!;
  const csrf = (login.json() as { csrfToken: string }).csrfToken;
  const post = (body: string, query = "") =>
    app.inject({
      method: "POST",
      url: `/fhir/import${query}`,
      headers: {
        origin: ORIGIN,
        cookie: `cp_session=${cookie.value}`,
        "x-csrf-token": csrf,
        "content-type": "application/fhir+json",
      },
      payload: body,
    });

  const totals: Record<string, Record<string, number>> = {};
  for (const file of files) {
    const body = readFileSync(file, "utf8");
    const started = Date.now();
    const res = await post(body);
    const ms = Date.now() - started;
    const json = res.json() as {
      counts?: Record<string, Record<string, number>>;
      outcome?: { issue: { severity: string; details?: { coding?: { code: string }[] } }[] };
      issue?: { severity: string; details?: { coding?: { code: string }[] } }[];
    };
    const issues = json.outcome?.issue ?? json.issue ?? [];
    const byRule: Record<string, number> = {};
    for (const i of issues) {
      const k = `${i.severity} ${i.details?.coding?.[0]?.code ?? "?"}`;
      byRule[k] = (byRule[k] ?? 0) + 1;
    }
    console.log(`\n${path.basename(file)}: HTTP ${res.statusCode} in ${ms} ms`);
    for (const [type, c] of Object.entries(json.counts ?? {}).sort()) {
      console.log(
        `  ${type.padEnd(26)} created ${c["created"]}  duplicate ${c["duplicate"]}  skipped ${c["skipped"]}  invalid ${c["invalid"]}`,
      );
      const t = (totals[type] ??= { created: 0, duplicate: 0, skipped: 0, invalid: 0 });
      for (const k of Object.keys(t)) t[k]! += c[k] ?? 0;
    }
    for (const [k, n] of Object.entries(byRule).sort()) console.log(`  issue ${k}: ${n}`);
    if (res.statusCode >= 400) failed = true;
  }

  console.log("\ntotals over all files:");
  for (const [type, c] of Object.entries(totals).sort()) {
    console.log(
      `  ${type.padEnd(26)} created ${c["created"]}  duplicate ${c["duplicate"]}  skipped ${c["skipped"]}  invalid ${c["invalid"]}`,
    );
  }

  // Idempotency: the first patient bundle again must be refused as duplicates (409).
  const again = files.find((f) => /patient-1\.json$/.test(f));
  if (again) {
    const res = await post(readFileSync(again, "utf8"));
    const dups = (
      (res.json() as { issue?: { details?: { coding?: { code: string }[] } }[] }).issue ?? []
    ).filter((i) => i.details?.coding?.[0]?.code === "dup.existing").length;
    console.log(
      `\nre-import ${path.basename(again)}: HTTP ${res.statusCode}, dup.existing issues ${dups}`,
    );
    if (res.statusCode !== 409) failed = true;
  }
} finally {
  await app.close();
}
process.exit(failed ? 1 : 0);
