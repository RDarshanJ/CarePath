/**
 * Permission keys and the role matrix (PRD section 5, healthcare-domain research section 2.4,
 * advisor plan revision 1 access rule). This map is the TypeScript source of truth; migration
 * 20261120120000_role_permissions writes the same lists into "Role".permissions, and a test
 * asserts the database rows equal this map.
 *
 * A permission answers "may this role call this kind of route at all" (403 when missing).
 * Object scope is separate and always applies: organization equality for everyone, the
 * patient's own record for patients, and care-team membership for clinician writes. Out-of-scope
 * objects answer 404 (ADR-8).
 */
export const permissionDescriptions = {
  // Patient self-service (own record only).
  "patient.read_own": "Read own demographics and care-team card.",
  "patient.update_own": "Update limited own demographic fields.",
  "careplan.read_own": "Read own published care plan versions.",
  "session.write_own": "Start, pause, resume and finish own exercise sessions.",
  "checkin.write_own": "Create own check-ins and pain reports.",
  "appointment.manage_own": "Book, read and cancel own appointments.",
  "message.own": "Read and send in own conversations.",
  "consent.manage_own": "Grant, read and revoke own optional consents.",
  "fhir.export_own": "Export own record as a FHIR Bundle.",
  // Staff reads. Organization-wide; every record open is audited.
  "patient.read": "Read patient demographics in the organization.",
  "patient.update_admin": "Update administrative patient fields.",
  "clinical.read":
    "Read intake, conditions, goals, plans, sessions, observations, notes and AI output.",
  "careplan.status_read": "Read care plan status without clinical content.",
  "activity.summary_read": "Read activity counts and aggregates without clinical content.",
  // Clinical writes. Care-team patients only.
  "clinical.write":
    "Create and edit conditions, goals and care plan drafts for care-team patients.",
  "careplan.publish": "Publish care plan versions for care-team patients.",
  "note.write": "Draft clinical notes for care-team patients.",
  "note.sign": "Sign own clinical notes for care-team patients.",
  "ai.generate": "Generate AI summaries and drafts for care-team patients.",
  "ai.review": "Approve, edit or reject AI output for care-team patients.",
  // Review queue.
  "review_task.read": "Read the review queue.",
  "review_task.resolve": "Assign and resolve clinical review tasks for care-team patients.",
  "review_task.resolve_admin": "Resolve review tasks raised by administrative rules.",
  "review_rule.manage": "Configure review rules.",
  // Scheduling.
  "appointment.read": "Read appointments in the organization.",
  "appointment.manage": "Book, reschedule and cancel appointments in the organization.",
  "availability.manage_own": "Manage own availability.",
  "availability.manage": "Manage availability for any clinician in the organization.",
  // Messaging.
  "message.care_team": "Read and send in care-team patient conversations.",
  "message.org": "Read and send in organization conversations.",
  // Consent.
  "consent.read": "Read patient consent records.",
  // Administration.
  "enrollment.manage": "Enroll patients and manage intake status.",
  "assignment.manage": "Assign clinicians to care teams.",
  "metrics.read": "Read computed organization metrics.",
  "audit.read": "Read the audit log.",
  "fhir.export": "Export FHIR Bundles for organization patients.",
  "fhir.import": "Import FHIR Bundles.",
  "roles.read": "Read the role and permission matrix.",
  "settings.manage": "Change organization settings.",
} as const;

export type Permission = keyof typeof permissionDescriptions;
export const allPermissions = Object.keys(permissionDescriptions) as Permission[];

export const roleKeys = [
  "patient",
  "physical_therapist",
  "care_coordinator",
  "clinic_admin",
] as const;
export type RoleKey = (typeof roleKeys)[number];

export const rolePermissions: Record<RoleKey, readonly Permission[]> = {
  patient: [
    "patient.read_own",
    "patient.update_own",
    "careplan.read_own",
    "session.write_own",
    "checkin.write_own",
    "appointment.manage_own",
    "message.own",
    "consent.manage_own",
    "fhir.export_own",
  ],
  physical_therapist: [
    "patient.read",
    "clinical.read",
    "clinical.write",
    "careplan.publish",
    "note.write",
    "note.sign",
    "ai.generate",
    "ai.review",
    "review_task.read",
    "review_task.resolve",
    "appointment.read",
    "availability.manage_own",
    "message.care_team",
    "consent.read",
    "fhir.export",
  ],
  care_coordinator: [
    "patient.read",
    "patient.update_admin",
    "careplan.status_read",
    "activity.summary_read",
    "review_task.read",
    "review_task.resolve_admin",
    "appointment.read",
    "appointment.manage",
    "availability.manage",
    "message.org",
    "consent.read",
    "enrollment.manage",
    "assignment.manage",
    "metrics.read",
  ],
  clinic_admin: [
    "patient.read",
    "careplan.status_read",
    "activity.summary_read",
    "review_task.read",
    "review_rule.manage",
    "appointment.read",
    "availability.manage",
    "consent.read",
    "enrollment.manage",
    "assignment.manage",
    "metrics.read",
    "audit.read",
    "fhir.export",
    "fhir.import",
    "roles.read",
    "settings.manage",
  ],
};

export function isPermission(value: string): value is Permission {
  return Object.hasOwn(permissionDescriptions, value);
}
