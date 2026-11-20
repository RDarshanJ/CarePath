import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rolePermissions, roleKeys } from "../../src/core/authz/permissions.js";
import { as, login, testApp } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  roleRows,
  type OrgFixture,
} from "../support/repo.js";

const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;

beforeAll(async () => {
  app = await testApp(db);
  org = await createOrgFixture(db);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("role permissions", () => {
  it("stores the same permission keys in Role rows as permissions.ts (migration)", async () => {
    const rows = await roleRows(db);
    expect(rows.map((r) => r.key).sort()).toEqual([...roleKeys].sort());
    for (const row of rows) {
      expect([...row.permissions].sort(), row.key).toEqual(
        [...rolePermissions[row.key as keyof typeof rolePermissions]].sort(),
      );
      expect(row.permissions.length, row.key).toBeGreaterThan(0);
    }
  });

  it("follows the PRD matrix on the separations that matter", () => {
    expect(rolePermissions.clinic_admin).toContain("audit.read");
    for (const r of ["patient", "physical_therapist", "care_coordinator"] as const) {
      expect(rolePermissions[r]).not.toContain("audit.read");
      expect(rolePermissions[r]).not.toContain("roles.read");
    }
    // Admins and coordinators see no clinical content.
    for (const r of ["care_coordinator", "clinic_admin"] as const) {
      expect(rolePermissions[r]).not.toContain("clinical.read");
      expect(rolePermissions[r]).not.toContain("clinical.write");
    }
    expect(rolePermissions.patient.every((p) => p.endsWith("_own") || p === "message.own")).toBe(
      true,
    );
  });
});

describe("role permission denial", () => {
  it("returns the role matrix to an admin", async () => {
    const s = await login(app, org.admin.email);
    const res = await as(app, s)({ method: "GET", url: "/roles" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const therapist = body.roles.find((r: { key: string }) => r.key === "physical_therapist");
    expect(therapist.permissions.sort()).toEqual([...rolePermissions.physical_therapist].sort());
  });

  it.each([
    ["therapist", () => org.therapist.email],
    ["coordinator", () => org.coordinator.email],
    ["patient", () => org.patient.email],
  ])("answers 403 to a %s and audits the denial", async (_label, email) => {
    const s = await login(app, email());
    const res = await as(app, s)({ method: "GET", url: "/roles" });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      error: { code: "forbidden", message: "You do not have permission to do this." },
    });
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventName: "security.access_denied",
      outcome: "minor_failure",
      detailCode: "missing_permission",
      organizationId: org.orgId,
      action: "R",
    });
    expect(events[0]?.metadata).toMatchObject({ route: "/roles", permission: "roles.read" });
  });

  it("answers 401, not 403, with no session", async () => {
    const res = await app.inject({ method: "GET", url: "/roles" });
    expect(res.statusCode).toBe(401);
  });
});
