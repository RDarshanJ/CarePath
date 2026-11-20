import { EmptyState, Heading } from "@carepath/ui";

export const metadata = { title: "Overview | CarePath" };

// Interim page from WP 3.2a. WP 3.3 replaces it with the real screen.
export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <Heading level={1}>Overview</Heading>
      <EmptyState icon="home" title="Overview is not built yet">
        The work lists for your caseload arrive in the clinician work package. Nothing is shown here
        until it can show real records.
      </EmptyState>
    </div>
  );
}
