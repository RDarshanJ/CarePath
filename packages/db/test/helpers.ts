import { randomUUID } from "node:crypto";
import pg from "pg";
import { expect } from "vitest";
import { defaultDatabaseUrl } from "../src/client.js";
import { dbErrorInfo } from "../src/errors.js";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  max: 12,
});

type Row = Record<string, unknown>;

export async function one<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T> {
  const res = await pool.query(sql, params);
  if (res.rowCount !== 1) throw new Error(`expected one row, got ${res.rowCount}: ${sql}`);
  return res.rows[0] as T;
}

export async function insert(table: string, values: Row): Promise<string> {
  const cols = Object.keys(values);
  const sql = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")})
    VALUES (${cols.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`;
  const row = await one<{ id: string }>(sql, Object.values(values));
  return row.id;
}

/** Assert that a promise rejects with a Postgres error of the given SQLSTATE (and constraint). */
export async function expectDbError(
  work: Promise<unknown>,
  code: string,
  constraint?: string,
): Promise<void> {
  let caught: unknown;
  try {
    await work;
  } catch (error) {
    caught = error;
  }
  expect(caught, `expected SQLSTATE ${code}, but the statement succeeded`).toBeDefined();
  const info = dbErrorInfo(caught);
  expect(info?.code, String((caught as Error)?.message)).toBe(code);
  if (constraint) expect(info?.constraint).toBe(constraint);
}

export interface Org {
  orgId: string;
  slug: string;
  patientId: string;
  patientUserId: string;
  practitionerId: string;
  clinicianUserId: string;
  coordinatorUserId: string;
}

async function roleId(key: string): Promise<string> {
  return (await one<{ id: string }>(`SELECT id FROM "Role" WHERE key = $1`, [key])).id;
}

export async function addPatient(orgId: string, label = "p"): Promise<string> {
  return insert("Patient", {
    organizationId: orgId,
    mrn: `MRN-${label}-${randomUUID().slice(0, 8)}`,
    givenName: "Avery",
    familyName: "Synthetic",
    birthDate: "1980-04-02",
  });
}

export async function addMember(orgId: string, role: string): Promise<string> {
  const userId = await insert("User", {
    email: `${role}-${randomUUID()}@example.test`,
    passwordHash: "not-a-real-hash",
    displayName: `Synthetic ${role}`,
  });
  await insert("OrganizationMembership", {
    organizationId: orgId,
    userId,
    roleId: await roleId(role),
  });
  return userId;
}

/** A fresh organization with one patient (with login), one therapist and one coordinator. */
export async function createOrg(): Promise<Org> {
  const slug = `org-${randomUUID().slice(0, 12)}`;
  const orgId = await insert("Organization", { name: `Clinic ${slug}`, slug });
  const patientUserId = await addMember(orgId, "patient");
  const clinicianUserId = await addMember(orgId, "physical_therapist");
  const coordinatorUserId = await addMember(orgId, "care_coordinator");
  const patientId = await insert("Patient", {
    organizationId: orgId,
    userId: patientUserId,
    mrn: `MRN-${randomUUID().slice(0, 8)}`,
    givenName: "Jordan",
    familyName: "Synthetic",
    birthDate: "1975-09-14",
  });
  const practitionerId = await insert("Practitioner", {
    organizationId: orgId,
    userId: clinicianUserId,
    staffId: `PT-${randomUUID().slice(0, 8)}`,
    givenName: "Riley",
    familyName: "Example",
  });
  return {
    orgId,
    slug,
    patientId,
    patientUserId,
    practitionerId,
    clinicianUserId,
    coordinatorUserId,
  };
}

let dayOffset = 0;
/** A distinct future UTC day per call so tests never collide on time ranges. */
export function freshDay(): Date {
  dayOffset += 1;
  const d = new Date(Date.UTC(2030, 0, 1));
  d.setUTCDate(d.getUTCDate() + dayOffset + Math.floor(Math.random() * 3000));
  return d;
}

export function at(day: Date, hour: number, minute = 0): string {
  const d = new Date(day);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function appointment(org: Org, startsAt: string, endsAt: string, extra: Row = {}): Row {
  return {
    organizationId: org.orgId,
    patientId: org.patientId,
    practitionerId: org.practitionerId,
    type: "follow_up",
    startsAt,
    endsAt,
    bookedTimezone: "America/Phoenix",
    ...extra,
  };
}
