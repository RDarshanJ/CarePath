import type { ReactNode } from "react";
import { PatientFrame } from "../_components/patient-frame";
import { getClinic, requireOnboarded, requirePatient } from "../_lib/data";

/** The guided session hides the tab bar so one task is on screen; the way back to Today stays in the header. */
export default async function PatientSessionLayout({ children }: { children: ReactNode }) {
  const { session, patientId } = await requirePatient();
  await requireOnboarded(patientId);
  const clinic = await getClinic(patientId);
  return (
    <PatientFrame variant="focus" organizationName={session.organization.name} clinic={clinic}>
      {children}
    </PatientFrame>
  );
}
