import { Suspense } from "react";
import { ListSkeleton } from "../_components/common";
import { Messages } from "./messages";

export const metadata = { title: "Messages | CarePath" };

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} label="Loading messages" />}>
      <Messages />
    </Suspense>
  );
}
