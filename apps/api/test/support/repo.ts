/**
 * Test fixtures written straight to Postgres. A repo.ts file, so it may use the Prisma client
 * (ADR-8 lint rule). Every call creates a fresh organization with random slugs and emails, so
 * test files can run in parallel against one database.
 */
import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@carepath/db/client";
import { hashPassword } from "@carepath/shared/password";
import type { RequestCtx } from "../../src/core/context.js";
import type { Db, DbClient } from "../../src/core/db/repo.js";

export const PASSWORD = "synthetic-demo-password-1";

let passwordHash: Promise<string> | undefined;
function sharedHash(): Promise<string> {
  passwordHash ??= hashPassword(PASSWORD);
  return passwordHash;
}

export function createTestDb(): Db {
  return createPrismaClient(process.env["DATABASE_URL"]);
}

export interface Account {
  userId: string;
  email: string;
}

export interface OrgFixture {
  orgId: string;
  slug: string;
  /** Patient with a login, on therapist's care team. */
  patient: Account & { patientId: string };
  /** Second patient with a login in the same organization, not on anyone's care team. */
  otherPatient: Account & { patientId: string };
  /** On `patient`'s care team. */
  therapist: Account & { practitionerId: string };
  /** Same organization, not on any care team. */
  otherTherapist: Account & { practitionerId: string };
  coordinator: Account;
  admin: Account;
}

async function roleId(db: Db, key: string): Promise<string> {
  const row = await db.role.findUniqueOrThrow({
    where: { key: key as never },
    select: { id: true },
  });
  return row.id;
}

async function member(db: Db, orgId: string, role: string, label: string): Promise<Account> {
  const email = `${label}-${randomUUID()}@example.test`;
  const user = await db.user.create({
    data: { email, passwordHash: await sharedHash(), displayName: `Synthetic ${label}` },
    select: { id: true },
  });
  await db.organizationMembership.create({
    data: { organizationId: orgId, userId: user.id, roleId: await roleId(db, role) },
  });
  return { userId: user.id, email };
}

export interface PatientNames {
  givenName?: string;
  familyName?: string;
}

async function patientAccount(db: Db, orgId: string, label: string, names: PatientNames = {}) {
  const account = await member(db, orgId, "patient", label);
  const p = await db.patient.create({
    data: {
      organizationId: orgId,
      userId: account.userId,
      mrn: `MRN-${randomUUID().slice(0, 8)}`,
      givenName: names.givenName ?? "Jordan",
      familyName: names.familyName ?? "Synthetic",
      birthDate: new Date("1975-09-14"),
    },
    select: { id: true },
  });
  return { ...account, patientId: p.id };
}

async function therapistAccount(db: Db, orgId: string, label: string) {
  const account = await member(db, orgId, "physical_therapist", label);
  const pr = await db.practitioner.create({
    data: {
      organizationId: orgId,
      userId: account.userId,
      staffId: `PT-${randomUUID().slice(0, 8)}`,
      givenName: "Riley",
      familyName: "Example",
    },
    select: { id: true },
  });
  return { ...account, practitionerId: pr.id };
}

export async function createOrgFixture(db: Db, names: PatientNames = {}): Promise<OrgFixture> {
  const slug = `org-${randomUUID().slice(0, 12)}`;
  const org = await db.organization.create({
    data: { name: `Clinic ${slug}`, slug },
    select: { id: true },
  });
  const orgId = org.id;
  const patient = await patientAccount(db, orgId, "patient", names);
  const otherPatient = await patientAccount(db, orgId, "patient2");
  const therapist = await therapistAccount(db, orgId, "therapist");
  const otherTherapist = await therapistAccount(db, orgId, "therapist2");
  const coordinator = await member(db, orgId, "care_coordinator", "coordinator");
  const admin = await member(db, orgId, "clinic_admin", "admin");
  const team = await db.careTeam.create({
    data: { organizationId: orgId, patientId: patient.patientId, name: "Care team" },
    select: { id: true },
  });
  await db.careTeamMember.create({
    data: {
      organizationId: orgId,
      careTeamId: team.id,
      userId: therapist.userId,
      role: "primary_therapist",
    },
  });
  return { orgId, slug, patient, otherPatient, therapist, otherTherapist, coordinator, admin };
}

/** Add an existing user to another organization with a role (multi-organization login). */
export async function addMembership(db: Db, orgId: string, userId: string, role: string) {
  await db.organizationMembership.create({
    data: { organizationId: orgId, userId, roleId: await roleId(db, role) },
  });
}

export async function auditEventsForRequest(db: Db, requestId: string) {
  return db.auditEvent.findMany({ where: { requestId }, orderBy: { occurredAt: "asc" } });
}

export async function findAuthSession(db: Db, sessionId: string) {
  return db.authSession.findUniqueOrThrow({ where: { id: sessionId } });
}

export async function sessionsForUser(db: Db, userId: string) {
  return db.authSession.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export async function roleRows(db: Db) {
  return db.role.findMany({ select: { key: true, permissions: true } });
}

export async function jobRow(db: Db, id: string) {
  return db.job.findUniqueOrThrow({ where: { id } });
}

export async function latestActiveSessionId(db: Db, userId: string): Promise<string> {
  const row = await db.authSession.findFirstOrThrow({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return row.id;
}

/** Simulates recent activity without stepping through hours of requests. */
export async function setLastSeen(db: Db, sessionId: string, at: Date): Promise<void> {
  await db.authSession.update({ where: { id: sessionId }, data: { lastSeenAt: at } });
}

/** Scoped write used by the M4 fixture route: organization-filtered like every repository. */
export async function setPatientPhone(
  db: DbClient,
  ctx: RequestCtx,
  patientId: string,
  phone: string,
): Promise<void> {
  const res = await db.patient.updateMany({
    where: { id: patientId, organizationId: ctx.orgId },
    data: { phone },
  });
  if (res.count !== 1) throw new Error("patient not found in scope");
}

export async function patientPhone(db: Db, patientId: string): Promise<string | null> {
  const row = await db.patient.findUniqueOrThrow({
    where: { id: patientId },
    select: { phone: true },
  });
  return row.phone;
}

/**
 * Statements that violate one database rule each, for the M5 error-mapping tests. Each runs
 * through the typed client, exactly as a service would hit it.
 */
export async function violate(
  db: Db,
  org: OrgFixture,
  kind: "overlap" | "duplicate" | "transition" | "domain_rule",
): Promise<void> {
  switch (kind) {
    case "overlap": {
      const startsAt = new Date(Date.UTC(2031, 0, 1 + Math.floor(Math.random() * 3000), 15));
      const endsAt = new Date(startsAt.getTime() + 45 * 60_000);
      const appointment = {
        organizationId: org.orgId,
        patientId: org.patient.patientId,
        practitionerId: org.therapist.practitionerId,
        type: "follow_up" as const,
        startsAt,
        endsAt,
        bookedTimezone: "America/Phoenix",
      };
      await db.appointment.create({ data: appointment });
      await db.appointment.create({
        data: { ...appointment, patientId: org.otherPatient.patientId },
      });
      return;
    }
    case "duplicate": {
      const mrn = `MRN-dup-${randomUUID().slice(0, 8)}`;
      const patient = {
        organizationId: org.orgId,
        mrn,
        givenName: "Avery",
        familyName: "Synthetic",
        birthDate: new Date("1980-04-02"),
      };
      await db.patient.create({ data: patient });
      await db.patient.create({ data: patient });
      return;
    }
    case "transition":
      // intake_incomplete -> discharged is not in StatusTransition.
      await db.patient.update({
        where: { id: org.otherPatient.patientId },
        data: { status: "discharged" },
      });
      return;
    case "domain_rule":
      // A user is a patient or a practitioner, never both (CP003).
      await db.practitioner.create({
        data: {
          organizationId: org.orgId,
          userId: org.patient.userId,
          staffId: `PT-dual-${randomUUID().slice(0, 8)}`,
          givenName: "Dual",
          familyName: "Profile",
        },
      });
      return;
  }
}
