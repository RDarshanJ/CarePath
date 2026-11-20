import { Heading } from "@carepath/ui";
import { ConsentManager } from "../../_components/consent-manager";
import { getClinic, getConsents, requirePatient } from "../../_lib/data";

export const metadata = { title: "Sharing and consent | CarePath" };

export default async function ConsentPage() {
  const { patientId } = await requirePatient();
  const [consents, clinic] = await Promise.all([getConsents(patientId), getClinic(patientId)]);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Heading level={1}>Sharing and consent</Heading>
        <p className="max-w-measure text-body text-ink-muted">
          What you agreed to, when it changed, and how to change it. Required and optional choices
          are kept apart.
        </p>
      </header>
      <ConsentManager
        patientId={patientId}
        initial={consents}
        timezone={clinic.timezone}
        clinicPhone={clinic.phone}
      />
    </div>
  );
}
