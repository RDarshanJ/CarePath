/**
 * Integrity checks over the seeded database. They run inside the seed transaction (a failure
 * rolls the seed back) and on demand with `pnpm db:seed --check`. The database already enforces
 * foreign keys, exclusion constraints and triggers; these checks cover what it cannot know:
 * the profile's counts, the fixed demo accounts, the edge cases the brief asks for, the
 * synthetic markers, and cross-table agreement (sessions run against their patient's plan,
 * review evidence points at real rows, inactive patients really are inactive).
 */
import type pg from "pg";
import { slugify } from "./ctx.js";
import { clinicNames } from "./data/text.js";
import type { SeedProfile } from "./profiles.js";

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

type Db = Pick<pg.ClientBase, "query">;

/** Fixed logins that must exist in every profile: email, role, organization index (0-based). */
export const fixedAccounts: readonly (readonly [string, string, number])[] = [
  ["patient.demo@carepath.test", "patient", 0],
  ["therapist.demo@carepath.test", "physical_therapist", 0],
  ["coordinator.demo@carepath.test", "care_coordinator", 0],
  ["admin.demo@carepath.test", "clinic_admin", 0],
  ["therapist.org2@carepath.test", "physical_therapist", 1],
  ["patient.resume@carepath.test", "patient", 0],
  ["patient.intake@carepath.test", "patient", 0],
  ["patient.noai@carepath.test", "patient", 0],
  ["patient.flare@carepath.test", "patient", 0],
];

export async function checkIntegrity(
  db: Db,
  expect: { profile: SeedProfile; anchor: string },
): Promise<Check[]> {
  const { profile, anchor } = expect;
  const checks: Check[] = [];
  const num = async (sql: string, params: unknown[] = []): Promise<number> => {
    const res = await db.query<{ n: string }>(sql, params);
    return Number((res.rows[0] as { n: string }).n);
  };
  const equals = async (name: string, sql: string, want: number, params: unknown[] = []) => {
    const got = await num(sql, params);
    checks.push({ name, ok: got === want, detail: `expected ${want}, found ${got}` });
  };
  const zero = (name: string, sql: string, params: unknown[] = []) => equals(name, sql, 0, params);
  const atLeast = async (name: string, sql: string, min = 1, params: unknown[] = []) => {
    const got = await num(sql, params);
    checks.push({ name, ok: got >= min, detail: `expected at least ${min}, found ${got}` });
  };

  // ---- counts from the profile ---------------------------------------------------------
  await equals("organizations", `SELECT count(*) n FROM "Organization"`, profile.orgs);
  await equals(
    "practitioners",
    `SELECT count(*) n FROM "Practitioner"`,
    profile.orgs * profile.therapistsPerOrg,
  );
  await equals("patients", `SELECT count(*) n FROM "Patient"`, profile.patients);
  await equals("exercise library entries", `SELECT count(DISTINCT slug) n FROM "Exercise"`, 50);
  await equals(
    "exercises per organization",
    `SELECT count(*) n FROM "Exercise"`,
    50 * profile.orgs,
  );
  await equals("appointments", `SELECT count(*) n FROM "Appointment"`, profile.appointments);
  await equals("encounters", `SELECT count(*) n FROM "Encounter"`, profile.encounters);
  if (profile.activityRecords !== null)
    await equals(
      "activity records",
      `SELECT count(*) n FROM "SessionActivity"`,
      profile.activityRecords,
    );

  // ---- fixed demo accounts -------------------------------------------------------------
  for (const [email, role, orgIndex] of fixedAccounts) {
    await equals(
      `account ${email}`,
      `SELECT count(*) n FROM "User" u JOIN "OrganizationMembership" m ON m."userId" = u.id JOIN "Role" r ON r.id = m."roleId"
       JOIN "Organization" o ON o.id = m."organizationId"
       WHERE u.email = $1 AND r.key = $2::"RoleKey" AND o.slug = $3`,
      1,
      [email, role, slugify(clinicNames[orgIndex] as string)],
    );
  }
  await zero(
    "password hashes use the scrypt format",
    `SELECT count(*) n FROM "User" WHERE "passwordHash" !~ '^scrypt\\$[0-9]+\\$[0-9]+\\$[0-9]+\\$[A-Za-z0-9_-]+\\$[A-Za-z0-9_-]+$'`,
  );

  // ---- synthetic markers ---------------------------------------------------------------
  await zero(
    "every email is on the .test domain",
    `SELECT count(*) n FROM "User" WHERE email !~ '@carepath\\.test$'`,
  );
  await zero("every MRN starts with SYN-", `SELECT count(*) n FROM "Patient" WHERE mrn !~ '^SYN-'`);
  await zero(
    "every organization is marked synthetic",
    `SELECT count(*) n FROM "Organization" WHERE name !~ '\\(synthetic\\)$'`,
  );
  await zero(
    "clinician NPIs cannot be real",
    `SELECT count(*) n FROM "Practitioner" WHERE npi IS NOT NULL AND npi !~ '^9'`,
  );

  // ---- edge cases the brief asks for -----------------------------------------------------
  await atLeast(
    "check-ins with pain 7 or higher",
    `SELECT count(*) n FROM "PatientCheckIn" WHERE "painScore" >= 7`,
  );
  await atLeast(
    "open review task for reported pain",
    `SELECT count(*) n FROM "ReviewTask" t JOIN "ReviewRule" r ON r.id = t."ruleId" WHERE r.key = 'reported_pain' AND t.status = 'open'`,
  );
  await atLeast(
    "patients with incomplete intake",
    `SELECT count(*) n FROM "Patient" p JOIN "IntakeAssessment" i ON i."patientId" = p.id WHERE p.status = 'intake_incomplete' AND i.status = 'in_progress'`,
  );
  await atLeast(
    "patients awaiting assignment",
    `SELECT count(*) n FROM "Patient" WHERE status = 'awaiting_assignment'`,
  );
  await atLeast("inactive patients", `SELECT count(*) n FROM "Patient" WHERE status = 'inactive'`);
  await atLeast(
    "discharged patients",
    `SELECT count(*) n FROM "Patient" WHERE status = 'discharged'`,
  );
  await atLeast(
    "active patients without ai_assisted_features consent",
    `SELECT count(*) n FROM "Patient" p WHERE p.status = 'active' AND NOT EXISTS (SELECT 1 FROM "Consent" c WHERE c."patientId" = p.id AND c.type = 'ai_assisted_features' AND c.status = 'active')`,
  );
  await atLeast(
    "patients with ai_assisted_features consent",
    `SELECT count(*) n FROM "Consent" WHERE type = 'ai_assisted_features' AND status = 'active'`,
  );
  await atLeast("revoked consents", `SELECT count(*) n FROM "Consent" WHERE status = 'inactive'`);
  await atLeast(
    "cancelled by patient",
    `SELECT count(*) n FROM "Appointment" WHERE status = 'cancelled_by_patient'`,
  );
  await atLeast(
    "cancelled by clinic",
    `SELECT count(*) n FROM "Appointment" WHERE status = 'cancelled_by_clinic'`,
  );
  await atLeast(
    "no-show appointments",
    `SELECT count(*) n FROM "Appointment" WHERE status = 'no_show'`,
  );
  await atLeast(
    "rescheduled appointments",
    `SELECT count(*) n FROM "Appointment" WHERE "rescheduledFromId" IS NOT NULL`,
  );
  await atLeast(
    "care plans with version 2 or later",
    `SELECT count(*) n FROM "CarePlanVersion" WHERE "versionNumber" >= 2`,
  );
  await zero(
    "versions 2+ carry a patient change note",
    `SELECT count(*) n FROM "CarePlanVersion" WHERE "versionNumber" >= 2 AND btrim(coalesce("changeNoteForPatient", '')) = ''`,
  );
  await atLeast(
    "paused sessions (resume)",
    `SELECT count(*) n FROM "ExerciseSession" WHERE status = 'paused'`,
  );
  await atLeast(
    "abandoned sessions",
    `SELECT count(*) n FROM "ExerciseSession" WHERE status = 'abandoned'`,
  );
  await atLeast(
    "skipped activities",
    `SELECT count(*) n FROM "SessionActivity" WHERE status = 'skipped'`,
  );
  await atLeast(
    "activities with discomfort",
    `SELECT count(*) n FROM "SessionActivity" WHERE "discomfortReported"`,
  );
  await atLeast(
    "sparse patients without contact details",
    `SELECT count(*) n FROM "Patient" WHERE email IS NULL AND phone IS NULL`,
  );
  await atLeast(
    "patients without a login",
    `SELECT count(*) n FROM "Patient" WHERE "userId" IS NULL`,
  );
  await atLeast("failed messages", `SELECT count(*) n FROM "Message" WHERE status = 'failed'`);
  await atLeast(
    "unread messages",
    `SELECT count(*) n FROM "Conversation" c JOIN "ConversationParticipant" p ON p."conversationId" = c.id WHERE c."lastMessageAt" > coalesce(p."lastReadAt", '-infinity')`,
  );
  await equals("a failed (dead) job", `SELECT count(*) n FROM "Job" WHERE status = 'dead'`, 1);
  await atLeast("signed notes", `SELECT count(*) n FROM "ClinicalNote" WHERE status = 'signed'`);
  await atLeast("draft notes", `SELECT count(*) n FROM "ClinicalNote" WHERE status = 'draft'`);
  await atLeast(
    "note versions drafted by AI",
    `SELECT count(*) n FROM "ClinicalNoteVersion" WHERE source = 'ai_draft'`,
  );
  await atLeast(
    "AI summary awaiting review",
    `SELECT count(*) n FROM "AIGeneration" g WHERE g.kind = 'progress_summary' AND g.status = 'succeeded' AND NOT EXISTS (SELECT 1 FROM "AIReview" r WHERE r."generationId" = g.id)`,
  );
  await atLeast(
    "a failed AI generation",
    `SELECT count(*) n FROM "AIGeneration" WHERE status = 'failed'`,
  );

  await zero(
    "skipped activities carry a skip reason",
    `SELECT count(*) n FROM "SessionActivity" WHERE status = 'skipped' AND "skipReason" IS NULL`,
  );
  await atLeast(
    "sessions stopped for discomfort",
    `SELECT count(*) n FROM "ExerciseSession" WHERE status = 'stopped_discomfort'`,
  );
  await zero(
    "stopped sessions record the discomfort that stopped them",
    `SELECT count(*) n FROM "ExerciseSession" s WHERE s.status = 'stopped_discomfort' AND NOT EXISTS (SELECT 1 FROM "SessionActivity" a WHERE a."sessionId" = s.id AND a."discomfortReported")`,
  );
  await zero(
    "every organization has a clinic phone and reply-time text",
    `SELECT count(*) n FROM "Organization" WHERE phone IS NULL OR "replyTimeText" IS NULL`,
  );
  await equals(
    "unused, unexpired enrollment codes (3 per organization)",
    `SELECT count(*) n FROM "EnrollmentCode" WHERE "redeemedAt" IS NULL AND "expiresAt" > $1::timestamptz`,
    3 * profile.orgs,
    [anchor],
  );
  await equals(
    "redeemed enrollment codes (1 per organization)",
    `SELECT count(*) n FROM "EnrollmentCode" WHERE "redeemedAt" IS NOT NULL AND "redeemedAt" >= "createdAt" AND "redeemedAt" <= $1::timestamptz`,
    profile.orgs,
    [anchor],
  );
  await equals(
    "expired enrollment codes (1 per organization)",
    `SELECT count(*) n FROM "EnrollmentCode" WHERE "redeemedAt" IS NULL AND "expiresAt" <= $1::timestamptz`,
    profile.orgs,
    [anchor],
  );

  // ---- agreement between tables ----------------------------------------------------------
  await zero(
    "sessions run against their own patient's plan",
    `SELECT count(*) n FROM "ExerciseSession" s JOIN "CarePlanVersion" v ON v.id = s."carePlanVersionId" JOIN "CarePlan" c ON c.id = v."carePlanId" WHERE c."patientId" <> s."patientId"`,
  );
  await zero(
    "sessions start after their version was published",
    `SELECT count(*) n FROM "ExerciseSession" s JOIN "CarePlanVersion" v ON v.id = s."carePlanVersionId" WHERE s."startedAt" < v."publishedAt"`,
  );
  await zero(
    "session activities match their version's assignments",
    `SELECT count(*) n FROM "SessionActivity" a JOIN "ExerciseSession" s ON s.id = a."sessionId" JOIN "ExerciseAssignment" x ON x.id = a."assignmentId" WHERE x."carePlanVersionId" <> s."carePlanVersionId"`,
  );
  await zero(
    "check-ins link to their patient's session",
    `SELECT count(*) n FROM "PatientCheckIn" c JOIN "ExerciseSession" s ON s.id = c."sessionId" WHERE s."patientId" <> c."patientId"`,
  );
  await zero(
    "every pain check-in has a matching observation",
    `SELECT count(*) n FROM "PatientCheckIn" c WHERE NOT EXISTS (SELECT 1 FROM "Observation" o WHERE o."checkInId" = c.id AND o.code = '72514-3' AND o."valueQuantity" = c."painScore")`,
  );
  await zero(
    "current plan version is the latest",
    `SELECT count(*) n FROM "CarePlan" c WHERE c."currentVersionId" IS NOT NULL AND c."currentVersionId" <> (SELECT id FROM "CarePlanVersion" v WHERE v."carePlanId" = c.id ORDER BY "versionNumber" DESC LIMIT 1)`,
  );
  await zero(
    "active patients have a care team, primary therapist and active plan",
    `SELECT count(*) n FROM "Patient" p WHERE p.status = 'active' AND NOT (
      EXISTS (SELECT 1 FROM "CareTeam" t JOIN "CareTeamMember" m ON m."careTeamId" = t.id WHERE t."patientId" = p.id AND m.role = 'primary_therapist' AND m."endedAt" IS NULL)
      AND EXISTS (SELECT 1 FROM "CarePlan" c WHERE c."patientId" = p.id AND c.status = 'active'))`,
  );
  await zero(
    "awaiting and intake patients have no care team or plan",
    `SELECT count(*) n FROM "Patient" p WHERE p.status IN ('awaiting_assignment', 'intake_incomplete') AND (EXISTS (SELECT 1 FROM "CareTeam" t WHERE t."patientId" = p.id) OR EXISTS (SELECT 1 FROM "CarePlan" c WHERE c."patientId" = p.id))`,
  );
  await zero(
    "inactive patients were last active over 30 days ago",
    `SELECT count(*) n FROM "Patient" WHERE status = 'inactive' AND "lastActivityAt" > $1::timestamptz - interval '30 days'`,
    [anchor],
  );
  await zero(
    "no history after the anchor",
    `SELECT count(*) n FROM (
      SELECT "startedAt" t FROM "ExerciseSession" UNION ALL SELECT "submittedAt" FROM "PatientCheckIn" UNION ALL SELECT "createdAt" FROM "Message"
      UNION ALL SELECT "createdAt" FROM "Patient" UNION ALL SELECT "occurredAt" FROM "AuditEvent" UNION ALL SELECT "createdAt" FROM "ReviewTask") x WHERE t > $1::timestamptz`,
    [anchor],
  );
  await zero(
    "review task evidence points at existing rows",
    `SELECT count(*) n FROM "ReviewTask" t, jsonb_array_elements(t.evidence) e WHERE NOT (
      CASE e->>'type'
        WHEN 'PatientCheckIn' THEN EXISTS (SELECT 1 FROM "PatientCheckIn" x WHERE x.id = (e->>'id')::uuid AND x."patientId" = t."patientId")
        WHEN 'CarePlanVersion' THEN EXISTS (SELECT 1 FROM "CarePlanVersion" x JOIN "CarePlan" c ON c.id = x."carePlanId" WHERE x.id = (e->>'id')::uuid AND c."patientId" = t."patientId")
        WHEN 'IntakeAssessment' THEN EXISTS (SELECT 1 FROM "IntakeAssessment" x WHERE x.id = (e->>'id')::uuid AND x."patientId" = t."patientId")
        WHEN 'Appointment' THEN EXISTS (SELECT 1 FROM "Appointment" x WHERE x.id = (e->>'id')::uuid AND x."patientId" = t."patientId")
        ELSE false END)`,
  );
  await zero(
    "AI generation source references exist",
    `SELECT count(*) n FROM "AIGeneration" g, jsonb_array_elements(g.input->'sourceRefs') e WHERE NOT (
      CASE e->>'type'
        WHEN 'ExerciseSession' THEN EXISTS (SELECT 1 FROM "ExerciseSession" x WHERE x.id = (e->>'id')::uuid AND x."patientId" = g."patientId")
        WHEN 'PatientCheckIn' THEN EXISTS (SELECT 1 FROM "PatientCheckIn" x WHERE x.id = (e->>'id')::uuid AND x."patientId" = g."patientId")
        WHEN 'Encounter' THEN EXISTS (SELECT 1 FROM "Encounter" x WHERE x.id = (e->>'id')::uuid AND x."patientId" = g."patientId")
        ELSE false END)`,
  );
  await zero(
    "AI generations only for patients with active consent at the time",
    `SELECT count(*) n FROM "AIGeneration" g WHERE NOT EXISTS (
      SELECT 1 FROM "Consent" c WHERE c."patientId" = g."patientId" AND c.type = 'ai_assisted_features' AND c."grantedAt" <= g."createdAt" AND (c."revokedAt" IS NULL OR c."revokedAt" > g."createdAt"))`,
  );
  await zero(
    "appointments fit inside their slot",
    `SELECT count(*) n FROM "Appointment" a JOIN "AvailabilitySlot" s ON s.id = a."slotId" WHERE a."startsAt" < s."startsAt" OR a."endsAt" > s."endsAt" OR a."practitionerId" <> s."practitionerId"`,
  );
  await zero(
    "booked slots have exactly one live appointment",
    `SELECT count(*) n FROM "AvailabilitySlot" s WHERE s.status = 'booked' AND (SELECT count(*) FROM "Appointment" a WHERE a."slotId" = s.id AND a.status NOT IN ('cancelled_by_patient', 'cancelled_by_clinic')) <> 1`,
  );

  return checks;
}
