import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import { testApp } from "../support/http.js";
import { createTestDb } from "../support/repo.js";

const db = createTestDb();
afterAll(async () => db.$disconnect());

describe("health", () => {
  it("reports ok when the database answers", async () => {
    const app = await testApp(db);
    try {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: "ok", checks: { database: "ok" } });
    } finally {
      await app.close();
    }
  });

  it("answers 503 when the database is unreachable", async () => {
    // Port 1 refuses connections; the app owns and closes this client.
    const app = await buildApp({
      config: { databaseUrl: "postgresql://carepath:carepath@127.0.0.1:1/carepath" },
    });
    try {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(503);
      expect(res.json()).toEqual({ status: "unavailable", checks: { database: "unavailable" } });
    } finally {
      await app.close();
    }
  });
});
