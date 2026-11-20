import { Suspense } from "react";
import { ListSkeleton } from "../../../_components/common";
import { PlanBuilder } from "./builder";

export const metadata = { title: "Care plan builder | CarePath" };

export default async function Page({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return (
    <Suspense fallback={<ListSkeleton rows={8} label="Loading care plan builder" />}>
      <PlanBuilder patientId={patientId} />
    </Suspense>
  );
}
