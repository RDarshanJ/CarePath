import { Suspense } from "react";
import { ListSkeleton, PageHeader } from "../_components/common";
import { ReviewQueue } from "./queue";

export const metadata = { title: "Review queue | CarePath" };

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <PageHeader title="Review queue" />
          <ListSkeleton rows={6} label="Loading review queue" />
        </div>
      }
    >
      <ReviewQueue />
    </Suspense>
  );
}
