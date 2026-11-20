import { Suspense } from "react";
import { ListSkeleton, PageHeader } from "../_components/common";
import { Directory } from "./directory";

export const metadata = { title: "Patients | CarePath" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <PageHeader title="Patients" />
          <ListSkeleton rows={8} label="Loading patients" />
        </div>
      }
    >
      <Directory />
    </Suspense>
  );
}
