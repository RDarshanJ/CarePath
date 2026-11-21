import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ThemeName } from "../../tokens/tokens";
import { Case, Cases } from "../../stories/helpers";
import {
  TODAY,
  daySessions,
  painPoints,
  painRange,
  planUpdates,
  weeks,
} from "../../stories/fixtures";
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
} from "./charts";
import { dayStripDays, painCaption, weeklyCaption, weeklyRows } from "./chart-data";
import { useTheme } from "../primitives/theme";

const meta = { title: "Healthcare/Clinical data" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Clinicians see the table beside the chart; patients open it with a button (CD-215). */
function useStaff(): boolean {
  const theme: ThemeName = useTheme();
  return theme === "clinician";
}

function PainFigure() {
  const staff = useStaff();
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
          width={staff ? 520 : 340}
          label="Patient-reported pain, 0 to 10, from 7 check-ins. The values are in the table."
        />
      }
      notes={<PainGapList points={painPoints} />}
      caption={painCaption(painPoints)}
      table={<PainTable points={painPoints} planUpdates={planUpdates} />}
    />
  );
}

function WeeklyFigure() {
  const staff = useStaff();
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
          width={staff ? 520 : 340}
          label="Sessions assigned and completed per week, 4 weeks. The values are in the table."
        />
      }
      caption={weeklyCaption(weeklyRows(weeks, TODAY))}
      table={<WeeklySessionsTable weeks={weeks} today={TODAY} />}
    />
  );
}

export const PainChartStory: Story = {
  name: "PainChart",
  render: () => <PainFigure />,
};

export const PainGapListStory: Story = {
  name: "PainGapList",
  render: () => (
    <Cases>
      <Case label="Gaps longer than 7 days, in words">
        <PainGapList points={painPoints} />
      </Case>
    </Cases>
  ),
};

export const PainTableStory: Story = {
  name: "PainTable",
  render: () => (
    <Cases>
      <Case label="With a Plan updated row">
        <PainTable points={painPoints} planUpdates={planUpdates} />
      </Case>
      <Case label="One check-in">
        <PainTable points={[painPoints[6]!]} />
      </Case>
    </Cases>
  ),
};

export const WeeklySessionsChartStory: Story = {
  name: "WeeklySessionsChart",
  render: () => <WeeklyFigure />,
};

export const SessionsLegendStory: Story = {
  name: "SessionsLegend",
  render: () => (
    <Cases>
      <Case label="With the current-week line">
        <SessionsLegend />
      </Case>
      <Case label="Without it">
        <SessionsLegend partialWeek={false} />
      </Case>
    </Cases>
  ),
};

export const WeeklySessionsTableStory: Story = {
  name: "WeeklySessionsTable",
  render: () => <WeeklySessionsTable weeks={weeks} today={TODAY} />,
};

const common = {
  sourceLabel: "Patient-reported",
  windowText: "Last 4 weeks",
  tableName: "pain ratings",
};

function ChartStates() {
  const staff = useStaff();
  const mode = staff ? "visible" : "toggle";
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartFigure
        {...common}
        title="Pain, no check-ins yet"
        headingLevel={4}
        state="empty"
        emptyText={
          staff
            ? "No check-ins recorded."
            : "No check-ins yet. Ratings appear here after your first check-in."
        }
      />
      <ChartFigure
        {...common}
        title="Pain, one check-in"
        headingLevel={4}
        tableMode={mode}
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
        tableMode={mode}
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
  );
}

export const ChartFigureStory: Story = {
  name: "ChartFigure",
  render: () => <ChartStates />,
};

export const DataStaleLineStory: Story = {
  name: "DataStaleLine",
  render: () => (
    <Cases>
      <Case label="Three hours old">
        <DataStaleLine noun="Check-in data" ageHours={3} onRefresh={() => undefined} />
      </Case>
      <Case label="Refreshing">
        <DataStaleLine noun="Session data" ageHours={26} onRefresh={() => undefined} refreshing />
      </Case>
    </Cases>
  ),
};

export const DayStripStory: Story = {
  name: "DayStrip",
  render: () => (
    <DayStrip
      days={dayStripDays({
        weekStart: "2026-11-16",
        today: TODAY,
        scheduledWeekdays: [1, 2, 3, 4, 5],
        sessions: daySessions,
      })}
      label="This week, Nov 16 to Nov 22"
    />
  ),
};
