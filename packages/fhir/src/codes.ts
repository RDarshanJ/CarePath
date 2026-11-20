/**
 * Code mappings between CarePath enums and FHIR R4 codes, and the required-binding value sets
 * CarePath checks itself (Medplum's validateResource does not reject a wrong code in a required
 * binding; measured in docs/evaluation/fhir-validation.md).
 */
import { SYSTEMS } from "./config.js";
import type {
  AppointmentStatus,
  CarePlanStatus,
  ConditionCategory,
  ConditionClinicalStatus,
  ConditionVerificationStatus,
  EncounterStatus,
  GoalLifecycleStatus,
  ObservationCategory,
  ObservationStatus,
} from "./types.js";

const hyphen = (s: string) => s.replace(/_/g, "-");
const underscore = (s: string) => s.replace(/-/g, "_");

export const FHIR_CODES = {
  administrativeGender: ["male", "female", "other", "unknown"],
  carePlanStatus: [
    "draft",
    "active",
    "on-hold",
    "revoked",
    "completed",
    "entered-in-error",
    "unknown",
  ],
  carePlanIntent: ["proposal", "plan", "order", "option"],
  carePlanActivityStatus: [
    "not-started",
    "scheduled",
    "in-progress",
    "on-hold",
    "completed",
    "cancelled",
    "stopped",
    "unknown",
    "entered-in-error",
  ],
  goalLifecycleStatus: [
    "proposed",
    "planned",
    "accepted",
    "active",
    "on-hold",
    "completed",
    "cancelled",
    "entered-in-error",
    "rejected",
  ],
  observationStatus: [
    "registered",
    "preliminary",
    "final",
    "amended",
    "corrected",
    "cancelled",
    "entered-in-error",
    "unknown",
  ],
  /** condition-clinical, flattened (recurrence and relapse sit under active, the rest under inactive). */
  conditionClinical: ["active", "recurrence", "relapse", "inactive", "remission", "resolved"],
  /** condition-ver-status, flattened (provisional and differential sit under unconfirmed). */
  conditionVerification: [
    "unconfirmed",
    "provisional",
    "differential",
    "confirmed",
    "refuted",
    "entered-in-error",
  ],
  appointmentStatus: [
    "proposed",
    "pending",
    "booked",
    "arrived",
    "fulfilled",
    "cancelled",
    "noshow",
    "entered-in-error",
    "checked-in",
    "waitlist",
  ],
  participationStatus: ["accepted", "declined", "tentative", "needs-action"],
  encounterStatus: [
    "planned",
    "arrived",
    "triaged",
    "in-progress",
    "onleave",
    "finished",
    "cancelled",
    "entered-in-error",
    "unknown",
  ],
  documentReferenceStatus: ["current", "superseded", "entered-in-error"],
  /** composition-status, the binding of DocumentReference.docStatus. */
  compositionStatus: ["preliminary", "final", "amended", "entered-in-error"],
  documentRelationshipType: ["replaces", "transforms", "signs", "appends"],
  bundleType: [
    "document",
    "message",
    "transaction",
    "transaction-response",
    "batch",
    "batch-response",
    "history",
    "searchset",
    "collection",
  ],
  dataAbsentReason: [
    "unknown",
    "asked-unknown",
    "temp-unknown",
    "not-asked",
    "asked-declined",
    "masked",
    "not-applicable",
    "unsupported",
    "as-text",
    "error",
    "not-a-number",
    "negative-infinity",
    "positive-infinity",
    "not-performed",
    "not-permitted",
  ],
} as const;

export const carePlanStatusToFhir = (s: CarePlanStatus) => hyphen(s);
export function carePlanStatusFromFhir(s: string | undefined): CarePlanStatus | null {
  const v = underscore(s ?? "");
  return (
    (["draft", "active", "on_hold", "revoked", "completed", "entered_in_error"] as const).find(
      (x) => x === v,
    ) ?? null
  );
}

/** Activity status written for each plan status (the plan's state applies to its exercises). */
export function activityStatusFor(s: CarePlanStatus): string {
  switch (s) {
    case "draft":
      return "not-started";
    case "active":
      return "scheduled";
    case "on_hold":
      return "on-hold";
    case "completed":
      return "completed";
    case "revoked":
      return "stopped";
    case "entered_in_error":
      return "entered-in-error";
  }
}

export const goalStatusToFhir = (s: GoalLifecycleStatus) => hyphen(s);
export function goalStatusFromFhir(s: string | undefined): GoalLifecycleStatus | null {
  const v = underscore(s ?? "");
  return (
    (
      [
        "proposed",
        "planned",
        "accepted",
        "active",
        "on_hold",
        "completed",
        "cancelled",
        "entered_in_error",
        "rejected",
      ] as const
    ).find((x) => x === v) ?? null
  );
}

export const observationStatusToFhir = (s: ObservationStatus) => hyphen(s);
export function observationStatusFromFhir(s: string | undefined): ObservationStatus | null {
  const v = underscore(s ?? "");
  return (
    (["final", "amended", "corrected", "cancelled", "entered_in_error"] as const).find(
      (x) => x === v,
    ) ?? null
  );
}

export const observationCategoryToFhir = (c: ObservationCategory) => hyphen(c);
export function observationCategoryFromFhir(c: string | undefined): ObservationCategory | null {
  const v = underscore(c ?? "");
  return (["survey", "activity", "exam", "vital_signs"] as const).find((x) => x === v) ?? null;
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const dayToFhir = (d: number) => DAYS[d]!;
export function dayFromFhir(d: string): number | null {
  const i = DAYS.indexOf(d as (typeof DAYS)[number]);
  return i >= 0 ? i : null;
}

/** NPI check digit (us-core-17): Luhn over "80840" + the 10 digits. */
export function isValidNpi(npi: string): boolean {
  if (!/^\d{10}$/.test(npi)) return false;
  const digits = `80840${npi}`.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[digits.length - 1 - i]!;
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Condition category: two codes from R4 condition-category, health-concern from US Core. */
export function conditionCategoryToFhir(c: ConditionCategory): { system: string; code: string } {
  return c === "health_concern"
    ? { system: SYSTEMS.usCoreConditionCategory, code: "health-concern" }
    : { system: SYSTEMS.conditionCategory, code: hyphen(c) };
}
export function conditionCategoryFromFhir(c: string | undefined): ConditionCategory | null {
  const v = underscore(c ?? "");
  return (
    (["problem_list_item", "encounter_diagnosis", "health_concern"] as const).find(
      (x) => x === v,
    ) ?? null
  );
}

export function conditionClinicalFromFhir(c: string | undefined): ConditionClinicalStatus | null {
  return (
    (["active", "recurrence", "relapse", "inactive", "remission", "resolved"] as const).find(
      (x) => x === c,
    ) ?? null
  );
}

export const conditionVerificationToFhir = (v: ConditionVerificationStatus) => hyphen(v);
export function conditionVerificationFromFhir(
  c: string | undefined,
): ConditionVerificationStatus | null {
  const v = underscore(c ?? "");
  return (
    (
      [
        "unconfirmed",
        "provisional",
        "differential",
        "confirmed",
        "refuted",
        "entered_in_error",
      ] as const
    ).find((x) => x === v) ?? null
  );
}

/**
 * Appointment status (research HD section 3.1). Both cancellations are `cancelled`; who cancelled
 * travels in cancelationReason (pat or prov from appointment-cancellation-reason).
 */
export function appointmentStatusToFhir(s: AppointmentStatus): string {
  switch (s) {
    case "requested":
      return "proposed";
    case "booked":
      return "booked";
    case "checked_in":
      return "checked-in";
    case "in_progress":
      return "arrived";
    case "completed":
      return "fulfilled";
    case "cancelled_by_patient":
    case "cancelled_by_clinic":
      return "cancelled";
    case "no_show":
      return "noshow";
  }
}
/** `cancelled` needs the cancelling party; the caller passes the cancelationReason code. */
export function appointmentStatusFromFhir(
  s: string | undefined,
  cancelledBy: string | undefined,
): AppointmentStatus | null {
  switch (s) {
    case "proposed":
    case "pending":
      return "requested";
    case "booked":
      return "booked";
    case "checked-in":
      return "checked_in";
    case "arrived":
      return "in_progress";
    case "fulfilled":
      return "completed";
    case "cancelled":
      return cancelledBy === "pat" ? "cancelled_by_patient" : "cancelled_by_clinic";
    case "noshow":
      return "no_show";
    default:
      return null;
  }
}

export const encounterStatusToFhir = (s: EncounterStatus) => hyphen(s);
export function encounterStatusFromFhir(s: string | undefined): EncounterStatus | null {
  const v = underscore(s ?? "");
  return (["in_progress", "finished", "entered_in_error"] as const).find((x) => x === v) ?? null;
}
