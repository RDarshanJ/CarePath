import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases } from "../../stories/helpers";
import { TZ, diffEmpty, diffV3, doses, exercises, versions } from "../../stories/fixtures";
import {
  DoseEditorRow,
  ExerciseSummary,
  MoveButtons,
  PlanDiff,
  PlanStateLine,
  VersionList,
} from "./plan";
import { moveAnnouncement } from "./plan-text";
import type { DoseDraft, DoseErrorKey } from "./plan";
import { LiveRegion, useAnnouncer } from "../../lib/live-region";

const meta = { title: "Healthcare/Treatment planning" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const ExerciseSummaryStory: Story = {
  name: "ExerciseSummary",
  render: () => (
    <Cases>
      <Case label="Library, one in the plan and two not">
        <ul className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
          {[exercises.bridge, exercises.squat, exercises.long].map((ex, i) => (
            <li key={ex.name} className="p-3">
              <ExerciseSummary
                exercise={ex}
                variant="library"
                inPlan={i === 0}
                onAdd={() => undefined}
              />
            </li>
          ))}
        </ul>
      </Case>
      <Case label="Patient plan and session overview, long name, no picture, instructions">
        <ul className="flex flex-col gap-4">
          <li>
            <ExerciseSummary
              exercise={exercises.squat}
              variant="plan"
              dose={doses.squat}
              schedule={{ daysOfWeek: [2, 4], timesPerDay: 2 }}
              clinicianInstructions="Hold the counter the whole time."
            />
          </li>
          <li>
            <ExerciseSummary
              exercise={exercises.long}
              variant="plan"
              dose={doses.long}
              schedule={{ daysOfWeek: [1, 3, 5], timesPerDay: 1 }}
            />
          </li>
          <li>
            <ExerciseSummary
              exercise={exercises.heel}
              variant="session-overview"
              dose={doses.heel}
            />
          </li>
        </ul>
      </Case>
    </Cases>
  ),
};

function Moves() {
  const [pos, setPos] = useState(1);
  const total = 3;
  const { message, announce } = useAnnouncer();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-body">
          Mini squat, position {pos + 1} of {total}
        </span>
        <MoveButtons
          name="Mini squat"
          index={pos}
          total={total}
          onMove={(dir) => {
            const next = dir === "up" ? pos - 1 : pos + 1;
            setPos(next);
            announce(moveAnnouncement("Mini squat", next + 1, total));
          }}
        />
      </div>
      <LiveRegion message={message} />
    </div>
  );
}

export const MoveButtonsStory: Story = {
  name: "MoveButtons",
  render: () => (
    <Cases>
      <Case label="Middle of the list: both directions work">
        <Moves />
      </Case>
      <Case label="First item: Move up is unavailable and says why">
        <MoveButtons name="Bridge" index={0} total={3} onMove={() => undefined} />
      </Case>
      <Case label="Last item: Move down is unavailable and says why">
        <MoveButtons name="Heel slide" index={2} total={3} onMove={() => undefined} />
      </Case>
    </Cases>
  ),
};

const editorStart: { key: keyof typeof exercises; value: DoseDraft }[] = [
  {
    key: "bridge",
    value: {
      dose: { ...doses.bridge, reps: null },
      schedule: { daysOfWeek: [1, 3, 5], timesPerDay: 1 },
      instructions: "Keep your back flat at the top.",
    },
  },
  {
    key: "squat",
    value: {
      dose: doses.squat,
      schedule: { daysOfWeek: [2, 4], timesPerDay: 2 },
      instructions: null,
    },
  },
  {
    key: "heel",
    value: {
      dose: doses.heel,
      schedule: { daysOfWeek: [], timesPerDay: 1 },
      instructions: null,
    },
  },
];

const errorsFor: Record<string, Partial<Record<DoseErrorKey, string>>> = {
  bridge: {
    dose: "Give repetitions, a duration or a hold time.",
    reps: "Enter repetitions from 1 to 200.",
  },
  squat: {},
  heel: { daysOfWeek: "Choose at least one day." },
};

function DoseEditor() {
  const [rows, setRows] = useState(editorStart);
  return (
    <ol className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.key}>
          <DoseEditorRow
            exercise={exercises[r.key]}
            value={r.value}
            errors={errorsFor[r.key] ?? {}}
            idPrefix={`dose-${r.key}`}
            index={i}
            total={rows.length}
            onMove={() => undefined}
            onChange={(value) =>
              setRows((all) => all.map((x) => (x.key === r.key ? { ...x, value } : x)))
            }
            onRemove={() => undefined}
          />
        </li>
      ))}
    </ol>
  );
}

export const DoseEditorRowStory: Story = {
  name: "DoseEditorRow",
  render: () => <DoseEditor />,
};

export const PlanDiffStory: Story = {
  name: "PlanDiff",
  render: () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <Cases>
        <Case label="Patient: what changed in version 3">
          <PlanDiff diff={diffV3} audience="patient" heading="What changed in version 3" />
        </Case>
        <Case label="Patient: first version">
          <PlanDiff diff={null} audience="patient" />
        </Case>
      </Cases>
      <Cases>
        <Case label="Staff: version 3 compared with version 2">
          <PlanDiff diff={diffV3} audience="staff" heading="Version 3 compared with version 2" />
        </Case>
        <Case label="Staff: nothing added, removed or changed">
          <PlanDiff diff={diffEmpty} audience="staff" />
        </Case>
      </Cases>
    </div>
  ),
};

export const VersionListStory: Story = {
  name: "VersionList",
  render: () => (
    <Cases>
      <Case label="Three versions, newest first, what changed in a disclosure">
        <VersionList
          versions={versions}
          audience="staff"
          timezone={TZ}
          diffs={{ v3: diffV3, v2: diffEmpty, v1: null }}
          headingAs="h3"
        />
      </Case>
      <Case label="Patient view">
        <VersionList
          versions={versions}
          audience="patient"
          timezone={TZ}
          diffs={{ v3: diffV3, v2: diffEmpty, v1: null }}
          headingAs="h3"
        />
      </Case>
      <Case label="Empty">
        <VersionList versions={[]} audience="staff" timezone={TZ} headingAs="h3" />
      </Case>
      <Case label="Could not load">
        <VersionList versions={[]} audience="staff" timezone={TZ} state="error" headingAs="h3" />
      </Case>
    </Cases>
  ),
};

const draft = { updatedAt: "2026-11-19T16:02:00Z", counts: { added: 1, removed: 1, changed: 2 } };

export const PlanStateLineStory: Story = {
  name: "PlanStateLine",
  render: () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <Cases>
        <Case label="Patient: current plan, earlier version, no plan yet">
          <div className="flex flex-col gap-3">
            <PlanStateLine audience="patient" currentVersion={3} timezone={TZ} />
            <PlanStateLine audience="patient" currentVersion={3} viewingVersion={2} timezone={TZ} />
            <PlanStateLine audience="patient" currentVersion={null} timezone={TZ} />
          </div>
        </Case>
      </Cases>
      <Cases>
        <Case label="Staff: draft, published, differs, earlier, stale, loading, error">
          <div className="flex flex-col gap-3">
            <PlanStateLine audience="staff" currentVersion={null} timezone={TZ} />
            <PlanStateLine audience="staff" currentVersion={null} draft={draft} timezone={TZ} />
            <PlanStateLine audience="staff" currentVersion={3} timezone={TZ} />
            <PlanStateLine audience="staff" currentVersion={3} draft={draft} timezone={TZ} />
            <PlanStateLine audience="staff" currentVersion={3} viewingVersion={2} timezone={TZ} />
            <PlanStateLine
              audience="staff"
              currentVersion={3}
              draft={draft}
              timezone={TZ}
              state="stale"
            />
            <PlanStateLine audience="staff" currentVersion={3} timezone={TZ} state="loading" />
            <PlanStateLine audience="staff" currentVersion={3} timezone={TZ} state="error" />
          </div>
        </Case>
      </Cases>
    </div>
  ),
};
