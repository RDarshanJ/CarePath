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
      displayName={session.user.displayName}
      clinic={clinic}
    >
      {/* Keeps a focused or scrolled-to control clear of the bottom tab bar (CD-125 sticky offsets). */}
      <div data-sticky-layout="patient-app" className="contents">
        {children}
      </div>
    </PatientFrame>
  );
}
