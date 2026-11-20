import { EmptyState, Heading } from "@carepath/ui";

export const metadata = { title: "Today | CarePath" };

// Interim page from WP 3.2a. WP 3.2b replaces it with the real Today screen.
export default function TodayPage() {
  return (
    <div className="flex flex-col gap-5">
      <Heading level={1}>Today</Heading>
      <EmptyState icon="calendar" title="Today is not built yet">
        Your plan for the day, the session player and the check-in arrive in the next work package.
        Nothing is shown here until it can show your real records.
      </EmptyState>
    </div>
  );
}
