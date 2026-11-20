/**
 * Checkpoint C1, M5: database conflicts answer 409 with stable codes, not 500, and never leak
 * constraint names, SQLSTATEs or database messages.
 */
import type { FastifyInstance } from "fastify";
import { errorCodes } from "@carepath/shared/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { dbErrorToCode } from "../../src/core/errors.js";
import { fixtureRoutes } from "../support/fixture-routes.js";
import { ORIGIN, testApp } from "../support/http.js";
import { createTestDb } from "../support/repo.js";

const db = createTestDb();
let app: FastifyInstance;

beforeAll(async () => {
  app = await testApp(db, { extraRoutes: fixtureRoutes });
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("database error mapping", () => {
  it.each([
    ["overlap", "23P01", "booking_conflict"],
    ["duplicate", "23505", "already_exists"],
    ["transition", "CP001", "invalid_transition"],
    ["domain_rule", "CP003", "rule_violation"],
  ] as const)("%s (%s) answers 409 %s", async (kind, _sqlstate, code) => {
    const res = await app.inject({
      method: "POST",
      url: `/test/db-error/${kind}`,
      headers: { origin: ORIGIN },
    });
    expect(res.statusCode, res.body).toBe(409);
    expect(res.json()).toEqual({ error: { code, message: errorCodes[code].message } });
    expect(res.body).not.toMatch(/23P01|23505|CP00|_key|_check|no_overlap|single profile/i);
  });

  it("leaves other database errors and non-database errors unmapped", () => {
    expect(dbErrorToCode({ code: "23503", message: "fk" })).toBeUndefined();
    expect(dbErrorToCode({ code: "CP002", message: "append-only" })).toBeUndefined();
    expect(dbErrorToCode(new Error("plain"))).toBeUndefined();
    expect(dbErrorToCode({ code: "23P01", message: "overlap" })).toBe("booking_conflict");
  });
});
