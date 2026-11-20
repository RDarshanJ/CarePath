import { doseFieldLabels } from "@carepath/shared";
import type { CarePlanDiff } from "@carepath/shared/contracts";

const fieldNames: Record<string, string> = {
  ...doseFieldLabels,
  daysOfWeek: "days",
  timesPerDay: "times per day",
  instructions: "your therapist's note",
  clinicianInstructions: "your therapist's note",
};

/** What the clinician's new version added, removed or changed, computed by the API (AC-B3). Words, not colour. */
export function DiffList({ diff }: { diff: CarePlanDiff }) {
  const empty = diff.added.length + diff.removed.length + diff.changed.length === 0;
  return (
    <div className="flex flex-col gap-2 text-body">
      {empty ? (
        <p className="text-ink-muted">No exercises were added, removed or changed.</p>
      ) : null}
      {diff.added.length > 0 ? (
        <p>
          <span className="font-semibold">Added:</span> {diff.added.map((e) => e.name).join(", ")}
        </p>
      ) : null}
      {diff.removed.length > 0 ? (
        <p>
          <span className="font-semibold">Removed:</span>{" "}
          {diff.removed.map((e) => e.name).join(", ")}
        </p>
      ) : null}
      {diff.changed.length > 0 ? (
        <div>
          <p className="font-semibold">Changed:</p>
          <ul className="mt-1 list-disc pl-5">
            {diff.changed.map((e) => (
              <li key={e.exerciseId}>
                {e.name}
                {e.fields.length > 0
                  ? ` (${e.fields.map((f) => fieldNames[f] ?? f).join(", ")})`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
