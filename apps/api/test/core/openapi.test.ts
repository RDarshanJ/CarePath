import SwaggerParser from "@apidevtools/swagger-parser";
import type { FastifyInstance } from "fastify";
import type { OpenAPIV3_1 } from "openapi-types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testApp } from "../support/http.js";
import { createTestDb } from "../support/repo.js";

const db = createTestDb();
let app: FastifyInstance;
let doc: OpenAPIV3_1.Document;

beforeAll(async () => {
  app = await testApp(db);
  const res = await app.inject({ method: "GET", url: "/docs/openapi.json" });
  expect(res.statusCode).toBe(200);
  doc = res.json();
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const methods = ["get", "post", "put", "patch", "delete"] as const;

function operations() {
  return Object.entries(doc.paths ?? {}).flatMap(([path, item]) =>
    methods.flatMap((m) => (item?.[m] ? [{ path, method: m, op: item[m]! }] : [])),
  );
}

describe("OpenAPI document", () => {
  it("is served without a session and validates as OpenAPI 3.1", async () => {
    expect(doc.openapi).toBe("3.1.0");
    await expect(SwaggerParser.validate(structuredClone(doc) as never)).resolves.toBeTruthy();
  });

  it("lists the core endpoints", () => {
    const listed = operations().map((o) => `${o.method.toUpperCase()} ${o.path}`);
    expect(listed).toEqual(
      expect.arrayContaining([
        "GET /health",
        "POST /auth/login",
        "POST /auth/logout",
        "GET /auth/session",
        "GET /roles",
        "GET /patients/{patientId}",
      ]),
    );
    expect(listed.some((l) => l.includes("/docs/"))).toBe(false);
  });

  it("gives every operation an id, a tag, and the shared error envelope for 4xx", () => {
    const ids = new Set<string>();
    for (const { path, method, op } of operations()) {
      expect(op.operationId, `${method} ${path}`).toBeTruthy();
      expect(ids.has(op.operationId!)).toBe(false);
      ids.add(op.operationId!);
      expect(op.tags?.length, `${method} ${path}`).toBeGreaterThan(0);
      for (const [status, response] of Object.entries(op.responses ?? {})) {
        if (!status.startsWith("4")) continue;
        const schema = (response as OpenAPIV3_1.ResponseObject).content?.["application/json"]
          ?.schema;
        expect(JSON.stringify(schema), `${method} ${path} ${status}`).toContain("ErrorEnvelope");
      }
    }
    expect(doc.components?.schemas?.["ErrorEnvelope"]).toBeDefined();
  });
});
