import { EmptyState, Heading } from "@carepath/ui";
import { getSession } from "../../../lib/auth/session";
import { roleLabel } from "../../../lib/auth/roles";

export const metadata = { title: "Administration | CarePath" };

export default async function AdminHomePage() {
  const result = await getSession();
  const role = result.status === "signed_in" ? roleLabel[result.session.role] : "Staff";
  return (
    <div className="flex flex-col gap-5">
      <Heading level={1}>Administration</Heading>
      <EmptyState icon="settings" title="Available in a later phase">
        {role} screens for enrollment, scheduling, settings, metrics and audit are planned for a
        later phase. You are signed in with a real session; there is no data to show here yet.
      </EmptyState>
    </div>
  );
}
