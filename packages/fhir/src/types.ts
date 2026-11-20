/**
 * CarePath-side shapes the mappers translate to and from FHIR. They mirror the database columns
 * (packages/db/prisma/schema.prisma) without depending on Prisma, so the mappers stay pure and
 * the API decides how rows are loaded and written. Dates are `YYYY-MM-DD`, instants ISO 8601 UTC.
 */

export type AdministrativeGender = "female" | "male" | "other" | "unknown";

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  phone: string | null;
}

export interface PatientRecord {
  id: string;
  mrn: string;
  givenName: string;
  familyName: string;
  birthDate: string;
  gender: AdministrativeGender;
  email: string | null;
  phone: string | null;
  preferredLanguage: string;
  active: boolean;
}

export interface PractitionerRecord {
  id: string;
  staffId: string;
  npi: string | null;
  givenName: string;
  familyName: string;
  credentials: string | null;
  active: boolean;
}

export type GoalLifecycleStatus =
  | "proposed"
  | "planned"
  | "accepted"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "entered_in_error"
  | "rejected";

export interface GoalRecord {
  id: string;
  patientId: string;
  description: string;
  lifecycleStatus: GoalLifecycleStatus;
  achievementStatus: string | null;
  measureSystem: string | null;
  measureCode: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  startDate: string | null;
  dueDate: string | null;
  /** Goal.addresses (batch 2): the condition this goal is about, when recorded. */
  addressesConditionId: string | null;
}

export type CarePlanStatus =
  "draft" | "active" | "on_hold" | "revoked" | "completed" | "entered_in_error";

/** One exercise prescription inside a published version (ExerciseAssignment). */
export interface CarePlanActivityRecord {
  exerciseSlug: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  holdSeconds: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  /** 0 is Sunday. */
  daysOfWeek: number[];
  timesPerDay: number;
  instructions: string | null;
}

/**
 * One published CarePlanVersion, exported as one FHIR CarePlan whose id is the version id. The
 * latest version carries the plan status; earlier versions are `revoked` and the newer one
 * points at the older through `replaces` (research HD section 3.2).
 */
export interface CarePlanRecord {
  versionId: string;
  carePlanId: string;
  patientId: string;
  versionNumber: number;
  title: string;
  instructions: string;
  changeNoteForPatient: string | null;
  status: CarePlanStatus;
  authorPractitionerId: string;
  publishedAt: string;
  replacesVersionId: string | null;
  goalIds: string[];
  activities: CarePlanActivityRecord[];
}

export type ObservationStatus =
  "final" | "amended" | "corrected" | "cancelled" | "entered_in_error";
export type ObservationCategory = "survey" | "activity" | "exam" | "vital_signs";

export interface ObservationRecord {
  id: string;
  patientId: string;
  status: ObservationStatus;
  category: ObservationCategory;
  codeSystem: string;
  code: string;
  display: string;
  valueQuantity: number | null;
  valueUnit: string | null;
  valueString: string | null;
  dataAbsentReason: string | null;
  performerType: "patient" | "practitioner";
  performerPractitionerId: string | null;
  /** Observation.encounter (batch 2): the visit it was captured in, when any. */
  encounterId: string | null;
  effectiveAt: string;
  recordedAt: string;
}

export type ConditionCategory = "problem_list_item" | "encounter_diagnosis" | "health_concern";
export type ConditionClinicalStatus =
  "active" | "recurrence" | "relapse" | "inactive" | "remission" | "resolved";
export type ConditionVerificationStatus =
  "unconfirmed" | "provisional" | "differential" | "confirmed" | "refuted" | "entered_in_error";

/** Condition table (problem list, encounter diagnosis, health concern). */
export interface ConditionRecord {
  id: string;
  patientId: string;
  encounterId: string | null;
  codeSystem: string;
  code: string;
  display: string;
  category: ConditionCategory;
  /** Null only when the condition was entered in error (con-5). */
  clinicalStatus: ConditionClinicalStatus | null;
  verificationStatus: ConditionVerificationStatus;
  bodySite: string | null;
  onsetDate: string | null;
  abatementDate: string | null;
  recordedByPractitionerId: string | null;
  note: string | null;
  /** Null when an imported Condition has no recordedDate; the database then stores the import time. */
  recordedAt: string | null;
}

export type AppointmentType = "initial_evaluation" | "follow_up" | "video_follow_up";
export type AppointmentStatus =
  | "requested"
  | "booked"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled_by_patient"
  | "cancelled_by_clinic"
  | "no_show";

/** Appointment table: a planned visit. Exported only; scheduling owns how appointments are made. */
export interface AppointmentRecord {
  id: string;
  patientId: string;
  practitionerId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  bookedTimezone: string;
  reason: string | null;
  cancellationReason: string | null;
  createdAt: string;
}

export type EncounterStatus = "in_progress" | "finished" | "entered_in_error";

/**
 * Encounter table: a synchronous visit that took place (class AMB in person, VR video).
 * Asynchronous review is never an Encounter. `typeSystem` is the code system of the visit type;
 * the database keeps it inside the type code column (see encounterTypeColumn).
 */
export interface EncounterRecord {
  id: string;
  patientId: string;
  practitionerId: string;
  appointmentId: string | null;
  class: "AMB" | "VR";
  typeSystem: string;
  typeCode: string;
  typeDisplay: string;
  status: EncounterStatus;
  startedAt: string;
  endedAt: string | null;
}

export type ClinicalNoteType = "progress_note" | "initial_evaluation";

/**
 * One signed version of a clinical note, exported as one DocumentReference whose id is the
 * ClinicalNoteVersion id. The version signed first has docStatus final; each amendment is a new
 * DocumentReference (docStatus amended) that replaces the one before it, which becomes
 * superseded. Build these with signedNoteDocuments(): drafts are never exported.
 */
export interface ClinicalNoteDocumentRecord {
  versionId: string;
  noteId: string;
  patientId: string;
  encounterId: string | null;
  authorPractitionerId: string;
  signerPractitionerId: string;
  noteType: ClinicalNoteType;
  versionNumber: number;
  isAmendment: boolean;
  amendmentReason: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  /** When this version was signed: the note's signature time, or the amendment's time. */
  signedAt: string;
  status: "current" | "superseded" | "entered_in_error";
  replacesVersionId: string | null;
}

export interface RecordByType {
  Organization: OrganizationRecord;
  Patient: PatientRecord;
  Practitioner: PractitionerRecord;
  Goal: GoalRecord;
  CarePlan: CarePlanRecord;
  Observation: ObservationRecord;
  Condition: ConditionRecord;
  Appointment: AppointmentRecord;
  Encounter: EncounterRecord;
  DocumentReference: ClinicalNoteDocumentRecord;
}

/** Batch 1 (checkpoint C2) and batch 2 (WP 5.4b): ten resource types. */
export type MappedType = keyof RecordByType;
export const MAPPED_TYPES: readonly MappedType[] = [
  "Organization",
  "Practitioner",
  "Patient",
  "CarePlan",
  "Goal",
  "Observation",
  "Condition",
  "Appointment",
  "Encounter",
  "DocumentReference",
];

export function isMappedType(t: string): t is MappedType {
  return (MAPPED_TYPES as readonly string[]).includes(t);
}

/**
 * Types import writes (plus Organization, which is matched, never created). Appointment and
 * DocumentReference are export only: bookings go through scheduling (slots, overlap constraints,
 * reminders), and a clinical note becomes signed only by its author inside CarePath. Import skips
 * them and lists them, like any other type outside this list.
 */
export type ImportType = Exclude<MappedType, "Organization" | "Appointment" | "DocumentReference">;
export const IMPORT_TYPES: readonly ImportType[] = [
  "Practitioner",
  "Patient",
  "Encounter",
  "Condition",
  "Goal",
  "CarePlan",
  "Observation",
];

export function isImportType(t: string): t is ImportType {
  return (IMPORT_TYPES as readonly string[]).includes(t);
}
