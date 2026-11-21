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
import type { Permission, RoleKey } from "@carepath/shared/contracts";

// The vocabulary (permission keys, role keys) is shared with the web app (checkpoint C1,
// ruling 3.5). The role matrix below is API policy.
export {
  allPermissions,
  isPermission,
  permissionDescriptions,
  roleKeys,
  type Permission,
  type RoleKey,
} from "@carepath/shared/contracts";

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
    // Checkpoint C3 ruling 4.3; granted by migration 20261126000000_phase5_c3_fixes.
    "note.mark_entered_in_error",
  ],
};
