import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases } from "../../stories/helpers";
import { PainScale } from "./pain-scale";
import { DateOfBirthField } from "./date-of-birth-field";
import { checkDateOfBirth, type DateParts } from "../../lib/date-of-birth";

const meta = { title: "Composed/Forms" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const PainScaleStory: Story = {
  name: "PainScale",
  render: () => (
    <Cases>
      <Case label="Nothing chosen">
        <PainScale hint="0 means no pain at all." />
      </Case>
      <Case label="After a session, stopped at 8">
        <PainScale label="Pain right now, after the session" defaultValue={8} stoppedAt={8} />
      </Case>
      <Case label="Error">
        <PainScale
          label="How much does it hurt right now?"
          error="Choose a pain number from 0 to 10 before you send this"
        />
      </Case>
      <Case label="Sending">
        <PainScale label="Pain right now (sending)" defaultValue={7} disabled />
      </Case>
    </Cases>
  ),
};

function Dob({ error }: { error?: boolean }) {
  const [value, setValue] = useState<DateParts>(
    error ? { day: "18", month: "", year: "1962" } : { day: "18", month: "10", year: "1962" },
  );
  const check = error ? checkDateOfBirth(value, "2026-11-19") : null;
  return (
    <DateOfBirthField
      id={error ? "story-dob-error" : "story-dob"}
      why="The clinic uses it to match you to your record."
      value={value}
      onChange={setValue}
      today="2026-11-19"
      {...(check?.error ? { error: check.error, errorParts: check.parts } : {})}
    />
  );
}

export const DateOfBirthFieldStory: Story = {
  name: "DateOfBirthField",
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <Dob />
      <Dob error />
    </div>
  ),
};
