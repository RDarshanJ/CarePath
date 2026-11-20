import type { ReactNode } from "react";
import { PatientFrame } from "../_components/patient-frame";
import { getClinic, requireOnboarded, requirePatient } from "../_lib/data";

export default async function PatientAppLayout({ children }: { children: ReactNode }) {
  const { session, patientId } = await requirePatient();
  await requireOnboarded(patientId);
  const clinic = await getClinic(patientId);
  return (
    <PatientFrame variant="app" organizationName={session.organization.name} clinic={clinic}>
      {children}
    </PatientFrame>
  );
}
