import { Suspense } from "react";
import { Heading } from "@carepath/ui";
import { AdminPatients } from "./patients";

export const metadata = { title: "Patients | CarePath" };

export default function Page() {
  return (
    <Suspense fallback={<Heading level={1}>Patients</Heading>}>
      <AdminPatients />
    </Suspense>
  );
}
