import { Suspense } from "react";
import { ListSkeleton } from "../_components/common";
import { Schedule } from "./schedule";

export const metadata = { title: "Schedule | CarePath" };

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} label="Loading schedule" />}>
      <Schedule />
    </Suspense>
  );
}
