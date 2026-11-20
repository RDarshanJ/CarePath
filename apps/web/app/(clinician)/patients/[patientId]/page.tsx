import { Suspense } from "react";
import { ListSkeleton } from "../../_components/common";
import { PatientRecord } from "./record";

export const metadata = { title: "Patient record | CarePath" };

export default async function Page({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return (
    <Suspense fallback={<ListSkeleton rows={8} label="Loading patient record" />}>
      <PatientRecord patientId={patientId} />
    </Suspense>
  );
}
