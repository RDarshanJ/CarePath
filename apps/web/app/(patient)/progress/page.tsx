import { EmptyState, Heading } from "@carepath/ui";

export const metadata = { title: "Progress | CarePath" };

// Interim page from WP 3.2a. WP 3.2b replaces it with the real Progress screen.
export default function ProgressPage() {
  return (
    <div className="flex flex-col gap-5">
      <Heading level={1}>Progress</Heading>
      <EmptyState icon="activity" title="Progress is not built yet">
        Weekly sessions and the pain you report arrive in the next work package. Charts are drawn
        only from your real sessions and check-ins, so there is nothing to show until then.
      </EmptyState>
    </div>
  );
}
