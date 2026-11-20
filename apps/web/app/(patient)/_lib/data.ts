import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import {
  carePlanVersionDetailSchema,
  carePlanVersionListSchema,
  clinicCardSchema,
  consentListSchema,
  intakeStateSchema,
  patientCarePlanSchema,
  progressViewSchema,
  todayViewSchema,
  type SessionInfo,
} from "@carepath/shared/contracts";
import { ApiError } from "../../../lib/api/errors";
import { serverGet } from "../../../lib/api/server";
import { requireShell } from "../../../lib/auth/guard";

/**
 * Server-side reads for the patient screens. Every call is a GET through the API with the
 * request's cookie (never a mock). `cache` keeps one request from fetching the same record twice
 * when a layout and a page both ask for it.
 */
export interface PatientContext {
  session: SessionInfo;
  patientId: string;
}

export const requirePatient = cache(async (): Promise<PatientContext> => {
  const session = await requireShell("patient");
  if (!session.patientId) notFound();
  return { session, patientId: session.patientId };
});

export const getToday = cache((patientId: string) =>
  serverGet(`/patients/${patientId}/today`, todayViewSchema),
);

export const getCarePlan = cache((patientId: string) =>
  serverGet(`/patients/${patientId}/care-plan`, patientCarePlanSchema),
);

export const getClinic = cache((patientId: string) =>
  serverGet(`/patients/${patientId}/clinic`, clinicCardSchema),
);

export const getProgress = cache((patientId: string, weeks: number) =>
  serverGet(`/patients/${patientId}/progress?weeks=${weeks}`, progressViewSchema),
);

export const getConsents = cache((patientId: string) =>
  serverGet(`/patients/${patientId}/consents`, consentListSchema),
);

export const getIntake = cache((patientId: string) =>
  serverGet(`/patients/${patientId}/intake`, intakeStateSchema),
);

/**
 * A patient who has not submitted onboarding belongs in onboarding, not in the app. Used by the app
 * layouts so a returning patient lands on the step they left (AC-A1).
 */
export async function requireOnboarded(patientId: string) {
  const today = await getToday(patientId);
  if (today.patient.status === "intake_incomplete") redirect("/onboarding");
  return today;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export const getVersionDetail = cache((patientId: string, versionId: string) =>
  serverGet(`/patients/${patientId}/care-plan/versions/${versionId}`, carePlanVersionDetailSchema),
);

export const getVersionList = cache((patientId: string) =>
  serverGet(`/patients/${patientId}/care-plan/versions`, carePlanVersionListSchema),
);
