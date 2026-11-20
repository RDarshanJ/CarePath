import type { z } from "zod";
import type { patientStatusSchema } from "../contracts/patients.js";
import type { StatusLabel, StatusTone } from "./types.js";

export type PatientStatus = z.infer<typeof patientStatusSchema>;

/** CD-231. One map and one tone function for the directory, the record and admin patients. */
export const patientStatusLabels: Record<
  PatientStatus,
  StatusLabel & { patientLabel: string | null }
> = {
  intake_incomplete: {
    label: "Intake incomplete",
    tone: "warning",
    form: "tag",
    patientLabel: "Setting up",
  },
  awaiting_assignment: {
    label: "Awaiting assignment",
    tone: "warning",
    form: "tag",
    patientLabel: "Setting up",
  },
  active: { label: "Active", tone: "success", form: "tag", patientLabel: null },
  inactive: { label: "Inactive", tone: "neutral", form: "tag", patientLabel: null },
  discharged: { label: "Discharged", tone: "neutral", form: "tag", patientLabel: null },
};

export function patientStatusLabel(status: PatientStatus): string {
  return patientStatusLabels[status].label;
}

export function patientStatusTone(status: PatientStatus): StatusTone {
  return patientStatusLabels[status].tone;
}

/**
 * Visible definition beside the status filter (DR-002 section 3, CD-231). Inactive and Discharged
 * get no definition until open sign-off S3 is answered.
 */
export const ACTIVE_STATUS_DEFINITION = "Active: intake submitted and a therapist assigned";

/** Intake as the admin directory reports it: the stored statuses plus "no intake record". */
export type IntakeDisplayStatus = "not_started" | "in_progress" | "submitted" | "reviewed";

export const intakeStatusLabels: Record<IntakeDisplayStatus, { label: string; complete: boolean }> =
  {
    not_started: { label: "Not started", complete: false },
    in_progress: { label: "In progress", complete: false },
    submitted: { label: "Submitted", complete: true },
    reviewed: { label: "Reviewed", complete: true },
  };

export function intakeStatusLabel(status: IntakeDisplayStatus): string {
  return intakeStatusLabels[status].label;
}
