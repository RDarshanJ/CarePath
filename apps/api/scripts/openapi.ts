/**
 * `pnpm openapi:check`: build the app (no database connection needed), generate the OpenAPI
 * document from the route schemas, validate it as OpenAPI 3.1, check house rules, and fail
 * when it differs from the committed apps/api/openapi.json.
 * `pnpm --filter @carepath/api openapi:write` regenerates the committed file.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPIV3_1 } from "openapi-types";
import { buildApp } from "../src/app.js";

const mode = process.argv[2];
if (mode !== "check" && mode !== "write") {
  console.error("usage: openapi.ts check|write");
  process.exit(2);
}

const target = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "openapi.json");
const app = await buildApp({ config: { logLevel: "silent" } });
const doc = structuredClone(app.swagger()) as OpenAPIV3_1.Document;
await app.close();

const problems: string[] = [];
try {
  await SwaggerParser.validate(structuredClone(doc) as never);
} catch (err) {
  problems.push(`invalid OpenAPI: ${(err as Error).message}`);
}

const methods = ["get", "post", "put", "patch", "delete"] as const;
const ids = new Set<string>();
let count = 0;
for (const [p, item] of Object.entries(doc.paths ?? {})) {
  for (const m of methods) {
    const op = item?.[m];
    if (!op) continue;
    count += 1;
    const where = `${m.toUpperCase()} ${p}`;
    if (!op.operationId) problems.push(`${where}: missing operationId`);
    else if (ids.has(op.operationId)) problems.push(`${where}: duplicate operationId`);
    else ids.add(op.operationId);
    if (!op.tags?.length) problems.push(`${where}: missing tag`);
    if (!op.summary) problems.push(`${where}: missing summary`);
    for (const [status, res] of Object.entries(op.responses ?? {})) {
      const schema = (res as OpenAPIV3_1.ResponseObject).content?.["application/json"]?.schema;
      if (status.startsWith("4") && !JSON.stringify(schema).includes("ErrorEnvelope")) {
        problems.push(`${where} ${status}: not the ErrorEnvelope schema`);
      }
    }
  }
}

const json = `${JSON.stringify(doc, null, 2)}\n`;
if (mode === "write") {
  await writeFile(target, json);
  console.log(`openapi: wrote ${path.relative(process.cwd(), target)} (${count} operations)`);
} else {
  const committed = await readFile(target, "utf8").catch(() => "");
  if (committed !== json) {
    problems.push(
      "apps/api/openapi.json is out of date; run pnpm --filter @carepath/api openapi:write",
    );
  }
}

if (problems.length > 0) {
  for (const p of problems) console.error(`openapi: ${p}`);
  process.exit(1);
}
console.log(`openapi: valid OpenAPI ${doc.openapi}, ${count} operations, house rules pass`);
