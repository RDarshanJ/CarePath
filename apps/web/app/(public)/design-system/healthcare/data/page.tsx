import type { Metadata } from "next";
import {
  ChartFigure,
  DataStaleLine,
  DayStrip,
  PainChart,
  PainGapList,
  PainTable,
  SessionsLegend,
  WeeklySessionsChart,
  WeeklySessionsTable,
  dayStripDays,
  painCaption,
  painListSummaryText,
  weeklyCaption,
  weeklyRows,
  type ThemeName,
} from "@carepath/ui";
import { Label, Section, Specimen } from "../../specimen";
import { FamilyPage } from "../families";
import { TODAY, daySessions, painPoints, painRange, planUpdates, weeks } from "../fixtures";

export const metadata: Metadata = {
  title: "Healthcare components: clinical data | CarePath",
};

function PainFigure({ theme }: { theme: ThemeName }) {
  const staff = theme === "clinician";
  return (
    <ChartFigure
      title="Patient-reported pain, 0 to 10"
      sourceLabel="Patient-reported"
      windowText="Last 4 weeks, Oct 23 to Nov 19"
      tableName="pain ratings"
      tableMode={staff ? "visible" : "toggle"}
      chart={
        <PainChart
          points={painPoints}
          range={painRange}
          planUpdates={planUpdates}
          showPlanTicks={staff}
          width={staff ? 520 : 360}
          label="Patient-reported pain, 0 to 10, from 7 check-ins. The values are in the table."
        />
      }
      notes={<PainGapList points={painPoints} />}
      caption={painCaption(painPoints)}
      table={<PainTable points={painPoints} planUpdates={planUpdates} />}
    />
  );
}

function WeeklyFigure({ theme }: { theme: ThemeName }) {
  const staff = theme === "clinician";
  return (
    <ChartFigure
      title="Sessions per week"
      sourceLabel="Session activity, not a measure of recovery"
      windowText="Last 4 weeks, weeks start on Monday"
      tableName="weekly sessions"
      tableMode={staff ? "visible" : "toggle"}
      legend={<SessionsLegend />}
      chart={
        <WeeklySessionsChart
          weeks={weeks}
          today={TODAY}
          width={staff ? 520 : 360}
          label="Sessions assigned and completed per week, 4 weeks. The values are in the table."
        />
      }
      caption={weeklyCaption(weeklyRows(weeks, TODAY))}
      table={<WeeklySessionsTable weeks={weeks} today={TODAY} />}
    />
  );
}

const common = {
  sourceLabel: "Patient-reported",
  windowText: "Last 4 weeks",
  tableName: "pain ratings",
};

export default function DataPage() {
  const days = dayStripDays({
    weekStart: "2026-11-16",
    today: TODAY,
    scheduledWeekdays: [1, 2, 3, 4, 5],
    sessions: daySessions,
  });
  return (
    <FamilyPage
      slug="data"
      intro="Every chart answers one question, labels its data class, keeps a fixed scale, prints its values, draws gaps as gaps and has an equal table. Patients open the table with a button; clinicians see it beside the chart. Captions are counts and dates only. No trend line, target, percentage, streak or colour by value."
    >
      <Section
        id="pain"
        title="Pain over time"
        intro="Points at their dates on a fixed 0 to 10 axis. A line joins check-ins at most 7 days apart; a longer gap is a break with words under the chart. Clinicians see plan versions as ticks; patients get a Plan updated row in the table only."
      >
        <Specimen id="pain-chart">{(t) => <PainFigure theme={t} />}</Specimen>
      </Section>

      <Section
        id="weekly"
        title="Sessions per week"
        intro="Assigned as an outline, completed solid, values printed above each bar. The current week is dashed and marked so far, because it counts days up to today. Stops for discomfort are a number in words."
      >
        <Specimen id="weekly-sessions">{(t) => <WeeklyFigure theme={t} />}</Specimen>
      </Section>

      <Section
        id="week"
        title="This week"
        intro="An ordered list of seven days with a word and an icon: Done, Stopped, Planned, Rest, Not done. Seven columns from 640 px, a list below."
      >
        <Specimen id="day-strip" only="patient">
          <DayStrip days={days} label="This week, Nov 16 to Nov 22" />
        </Specimen>
      </Section>

      <Section
        id="states"
        title="Missing, partial, failed and stale data"
        intro="Absence is never blank, zero or joined across. Each state says what is not known, in words, and keeps the section heading."
      >
        <Specimen id="chart-states">
          {(t) => (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartFigure
                {...common}
                title="Pain, no check-ins yet"
                headingLevel={4}
                state="empty"
                emptyText={
                  t === "patient"
                    ? "No check-ins yet. Ratings appear here after your first check-in."
                    : "No check-ins recorded."
                }
              />
              <ChartFigure
                {...common}
                title="Pain, one check-in"
                headingLevel={4}
                tableMode={t === "clinician" ? "visible" : "toggle"}
                chart={
                  <PainChart
                    points={[painPoints[6]!]}
                    range={painRange}
                    label="Patient-reported pain, 0 to 10, from 1 check-in. The value is in the table."
                  />
                }
                caption={painCaption([painPoints[6]!])}
                table={<PainTable points={[painPoints[6]!]} />}
              />
              <ChartFigure
                {...common}
                title="Pain, could not load"
                headingLevel={4}
                state="error"
                errorNoun="check-ins"
              />
              <ChartFigure {...common} title="Pain, loading" headingLevel={4} state="loading" />
              <ChartFigure
                {...common}
                title="Pain, stale data"
                headingLevel={4}
                tableMode={t === "clinician" ? "visible" : "toggle"}
                stale={<DataStaleLine noun="Check-in data" ageHours={3} />}
                chart={
                  <PainChart
                    points={painPoints.slice(0, 4)}
                    label="Patient-reported pain, 0 to 10, from 4 check-ins. The values are in the table."
                  />
                }
                caption={painCaption(painPoints.slice(0, 4))}
                table={<PainTable points={painPoints.slice(0, 4)} />}
              />
            </div>
          )}
        </Specimen>
      </Section>

      <Section
        id="list-summary"
        title="Summary in a list row"
        intro="Plain text with the value, its source, the date and the count in the window. No sparkline: it cannot carry units, dates or labels."
      >
        <Specimen id="pain-list-summary" only="clinician">
          <Label>With check-ins</Label>
          <p className="text-small text-ink">
            {painListSummaryText({ date: "2026-11-18", painScore: 6 }, 5, 14)}
          </p>
          <Label>No check-ins in the window</Label>
          <p className="text-small text-ink">{painListSummaryText(null, 0, 14)}</p>
        </Specimen>
      </Section>
    </FamilyPage>
  );
}
