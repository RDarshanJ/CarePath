-- WP 2.4: permission keys for the four roles. Source of truth: apps/api/src/core/authz/permissions.ts
-- (a test in apps/api asserts these rows equal that map). Data only, no schema change.

UPDATE "Role" SET "permissions" = ARRAY[
  'patient.read_own',
  'patient.update_own',
  'careplan.read_own',
  'session.write_own',
  'checkin.write_own',
  'appointment.manage_own',
  'message.own',
  'consent.manage_own',
  'fhir.export_own'
]::text[] WHERE "key" = 'patient';

UPDATE "Role" SET "permissions" = ARRAY[
  'patient.read',
  'clinical.read',
  'clinical.write',
  'careplan.publish',
  'note.write',
  'note.sign',
  'ai.generate',
  'ai.review',
  'review_task.read',
  'review_task.resolve',
  'appointment.read',
  'availability.manage_own',
  'message.care_team',
  'consent.read',
  'fhir.export'
]::text[] WHERE "key" = 'physical_therapist';

UPDATE "Role" SET "permissions" = ARRAY[
  'patient.read',
  'patient.update_admin',
  'careplan.status_read',
  'activity.summary_read',
  'review_task.read',
  'review_task.resolve_admin',
  'appointment.read',
  'appointment.manage',
  'availability.manage',
  'message.org',
  'consent.read',
  'enrollment.manage',
  'assignment.manage',
  'metrics.read'
]::text[] WHERE "key" = 'care_coordinator';

UPDATE "Role" SET "permissions" = ARRAY[
  'patient.read',
  'careplan.status_read',
  'activity.summary_read',
  'review_task.read',
  'review_rule.manage',
  'appointment.read',
  'availability.manage',
  'consent.read',
  'enrollment.manage',
  'assignment.manage',
  'metrics.read',
  'audit.read',
  'fhir.export',
  'fhir.import',
  'roles.read',
  'settings.manage'
]::text[] WHERE "key" = 'clinic_admin';
