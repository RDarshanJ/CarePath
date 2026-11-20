import type { ReactNode } from "react";
import { PatientFrame } from "../_components/patient-frame";
import { getClinic, requireOnboarded, requirePatient } from "../_lib/data";

export default async function PatientAppLayout({ children }: { children: ReactNode }) {
  const { session, patientId } = await requirePatient();
  const today = await requireOnboarded(patientId);
  const clinic = await getClinic(patientId);
  return (
    <PatientFrame
      variant="app"
      unreadMessages={today.messages.unreadCount}
      organizationName={session.organization.name}
      clinic={clinic}
    >
      {/* Keeps a focused or scrolled-to control clear of the bottom tab bar. */}
      <style>{"html{scroll-padding-bottom:6rem}"}</style>
      {children}
    </PatientFrame>
  );
}
