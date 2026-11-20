import { EmptyState, Heading, Table, TBody, Td, Th, THead, Tr } from "@carepath/ui";
import { BarsLegend, PainLine, WeeklyBars } from "../../_components/charts";
import { TableToggle } from "../../_components/table-toggle";
import { getProgress, requirePatient } from "../../_lib/data";
import { formatInstantDate, formatLocalDate, plural } from "../../_lib/format";

export const metadata = { title: "Progress | CarePath" };

const statusText = {
  completed: "Completed",
  stopped_discomfort: "Stopped for discomfort",
  abandoned: "Not finished",
} as const;

export default async function ProgressPage() {
  const { patientId } = await requirePatient();
  const progress = await getProgress(patientId, 4);
  const current = progress.weeks[progress.weeks.length - 1];
  const hasAnything =
    progress.sessions.length > 0 ||
    progress.pain.points.length > 0 ||
    progress.weeks.some((w) => w.assignedSessions > 0);

  if (!hasAnything) {
    return (
      <div className="flex flex-col gap-5">
        <Heading level={1}>Progress</Heading>
        <EmptyState icon="activity" title="Nothing to show yet">
          Your completed sessions, weekly totals and check-in pain ratings appear here after your
          plan is published and you do your first session.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <Heading level={1}>Progress</Heading>
        <p className="text-body text-ink-muted">
          What you did and what you reported over the last {progress.weeks.length} weeks. These are
          counts and your own ratings, not a measure of recovery.
        </p>
      </header>

      {current ? (
        <section aria-labelledby="now-heading" className="flex flex-col gap-2">
          <Heading level={3} id="now-heading">
            This week
          </Heading>
          <p className="font-heading text-h2 font-semibold">
            {current.completedSessions} of {current.assignedSessions} planned sessions so far this
            week
          </p>
          <p className="text-small text-ink-muted">
            Week of {formatLocalDate(current.weekStart, "short")}.{" "}
            {plural(current.completedActivities, "exercise")} done, {current.skippedActivities}{" "}
            skipped
            {current.stoppedSessions > 0
              ? `, ${plural(current.stoppedSessions, "session")} stopped for discomfort`
              : ""}
            .
          </p>
        </section>
      ) : null}

      <section
        aria-labelledby="weeks-heading"
        className="flex flex-col gap-3 border-t border-border pt-5"
      >
        <Heading level={3} id="weeks-heading">
          Assigned and completed sessions, by week
        </Heading>
        <BarsLegend />
        <WeeklyBars weeks={progress.weeks} />
        <TableToggle label="weekly sessions">
          <Table caption="Assigned and completed sessions by week">
            <THead>
              <Tr>
                <Th scope="col">Week starting</Th>
                <Th scope="col" numeric>
                  Assigned
                </Th>
                <Th scope="col" numeric>
                  Completed
                </Th>
                <Th scope="col" numeric>
                  Stopped
                </Th>
                <Th scope="col" numeric>
                  Exercises done
                </Th>
                <Th scope="col" numeric>
                  Exercises skipped
                </Th>
              </Tr>
            </THead>
            <TBody>
              {progress.weeks.map((w) => (
                <Tr key={w.weekStart}>
                  <Td>{formatLocalDate(w.weekStart, "short")}</Td>
                  <Td numeric>{w.assignedSessions}</Td>
                  <Td numeric>{w.completedSessions}</Td>
                  <Td numeric>{w.stoppedSessions}</Td>
                  <Td numeric>{w.completedActivities}</Td>
                  <Td numeric>{w.skippedActivities}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableToggle>
      </section>

      <section
        aria-labelledby="pain-heading"
        className="flex flex-col gap-3 border-t border-border pt-5"
      >
        <Heading level={3} id="pain-heading">
          Patient-reported pain
        </Heading>
        <p className="max-w-measure text-small text-ink-muted">
          Your own ratings from check-ins, on a scale of 0 to 10. They go up and down from day to
          day. This shows what you reported and nothing more.
        </p>
        {progress.pain.points.length === 0 ? (
          <EmptyState icon="activity" title="No check-ins yet">
            Each check-in you submit adds one point here. Your therapist sees the same ratings.
          </EmptyState>
        ) : (
          <>
            <PainLine points={progress.pain.points} />
            <TableToggle label="pain ratings">
              <Table caption="Patient-reported pain by check-in, 0 to 10">
                <THead>
                  <Tr>
                    <Th scope="col">Date</Th>
                    <Th scope="col" numeric>
                      Patient-reported pain (0 to 10)
                    </Th>
                  </Tr>
                </THead>
                <TBody>
                  {progress.pain.points.map((p) => (
                    <Tr key={p.checkInId}>
                      <Td>{formatLocalDate(p.date, "short")}</Td>
                      <Td numeric>{p.painScore}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableToggle>
          </>
        )}
      </section>

      <section
        aria-labelledby="sessions-heading"
        className="flex flex-col gap-3 border-t border-border pt-5"
      >
        <Heading level={3} id="sessions-heading">
          Sessions
        </Heading>
        {progress.sessions.length === 0 ? (
          <p className="text-body text-ink-muted">No sessions in this period.</p>
        ) : (
          <>
            <ul aria-label="Sessions in the last four weeks" className="flex flex-col sm:hidden">
              {progress.sessions.map((s) => (
                <li key={s.id} className="flex flex-col gap-0.5 border-b border-border py-3">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-body">
                    <span className="font-medium">
                      {formatInstantDate(s.startedAt, progress.timezone)}
                    </span>
                    <span>{statusText[s.status]}</span>
                  </p>
                  <p className="text-small text-ink-muted">
                    {s.completedActivities} done, {s.skippedActivities} skipped. Plan version{" "}
                    {s.versionNumber}.
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block">
              <Table caption="Sessions in the last four weeks">
                <THead>
                  <Tr>
                    <Th scope="col">Date</Th>
                    <Th scope="col">Result</Th>
                    <Th scope="col" numeric>
                      Done
                    </Th>
                    <Th scope="col" numeric>
                      Skipped
                    </Th>
                    <Th scope="col" numeric>
                      Plan version
                    </Th>
                  </Tr>
                </THead>
                <TBody>
                  {progress.sessions.map((s) => (
                    <Tr key={s.id}>
                      <Td>{formatInstantDate(s.startedAt, progress.timezone)}</Td>
                      <Td>{statusText[s.status]}</Td>
                      <Td numeric>{s.completedActivities}</Td>
                      <Td numeric>{s.skippedActivities}</Td>
                      <Td numeric>{s.versionNumber}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {progress.goals.length > 0 ? (
        <section
          aria-labelledby="goals-heading"
          className="flex flex-col gap-2 border-t border-border pt-5"
        >
          <Heading level={3} id="goals-heading">
            Goals set by your care team
          </Heading>
          <ul className="list-disc pl-5 text-body">
            {progress.goals.map((g, i) => (
              <li key={g.id ?? i}>
                {g.description}
                {g.targetValue !== null
                  ? ` (target ${g.targetValue}${g.targetUnit ? ` ${g.targetUnit}` : ""})`
                  : ""}
                {g.dueDate ? `, by ${formatLocalDate(g.dueDate, "short")}` : ""}
              </li>
            ))}
          </ul>
          <p className="text-small text-ink-muted">
            Your care team reviews goals with you at visits. CarePath does not score them.
          </p>
        </section>
      ) : null}
    </div>
  );
}
