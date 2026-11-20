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
  effectiveAt: string;
  recordedAt: string;
}

export interface RecordByType {
  Organization: OrganizationRecord;
  Patient: PatientRecord;
  Practitioner: PractitionerRecord;
  Goal: GoalRecord;
  CarePlan: CarePlanRecord;
  Observation: ObservationRecord;
}

/** Batch 1 (checkpoint C2, Phase 5). Batch 2 adds Condition, Appointment, Encounter, DocumentReference. */
export type MappedType = keyof RecordByType;
export const MAPPED_TYPES: readonly MappedType[] = [
  "Organization",
  "Practitioner",
  "Patient",
  "CarePlan",
  "Goal",
  "Observation",
];

export function isMappedType(t: string): t is MappedType {
  return (MAPPED_TYPES as readonly string[]).includes(t);
}
