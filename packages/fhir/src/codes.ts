/**
 * Code mappings between CarePath enums and FHIR R4 codes, and the required-binding value sets
 * CarePath checks itself (Medplum's validateResource does not reject a wrong code in a required
 * binding; measured in docs/evaluation/fhir-validation.md).
 */
import type {
  CarePlanStatus,
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
