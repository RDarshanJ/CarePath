import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases } from "../../stories/helpers";
import { Checkbox, Radio, RadioGroup, Switch } from "./choice";
import { FieldGroup } from "./field";
import { SegmentedControl, SlotButton, ToggleChip, ToggleChipGroup } from "./selection";
import { toggleExclusive } from "../../lib/forms";

const meta = { title: "Primitives/Choices" } satisfies Meta;
export default meta;
type Story = StoryObj;

const limitations = ["Kneeling", "Stairs", "Lifting", "None of these"] as const;

function CheckboxList() {
  const [picked, setPicked] = useState<string[]>(["Stairs"]);
  return (
    <FieldGroup
      legend="Movements that are hard for you"
      requirement="optional"
      hint="Select all that apply."
    >
      <div className="flex flex-col">
        {limitations.map((l) => (
          <Checkbox
            key={l}
            label={l}
            checked={picked.includes(l)}
            onCheckedChange={(v) =>
              setPicked(toggleExclusive(picked, l, v === true, "None of these").values)
            }
          />
        ))}
        <Checkbox label="Share my pain log" hint="Not available for this area." disabled />
      </div>
    </FieldGroup>
  );
}

export const CheckboxStory: Story = {
  name: "Checkbox",
  render: () => (
    <div className="max-w-md">
      <CheckboxList />
    </div>
  ),
};

export const RadioGroupStory: Story = {
  name: "RadioGroup",
  render: () => (
    <div className="max-w-md">
      <FieldGroup legend="Which side?" requirement="required" error="Select a side">
        <RadioGroup aria-label="Which side?">
          <Radio value="left" label="Left side" />
          <Radio value="right" label="Right side" />
          <Radio value="both" label="Both sides" />
          <Radio value="na" label="Does not apply" disabled hint="Not available for this area." />
        </RadioGroup>
      </FieldGroup>
    </div>
  ),
};

export const SwitchStory: Story = {
  name: "Switch",
  render: () => (
    <div className="flex max-w-md flex-col">
      <Switch label="Appointment reminders" hint="Sent the day before." />
      <Switch label="Share my pain log" defaultChecked />
      <Switch label="Quiet hours" disabled hint="Set by your clinic." />
    </div>
  ),
};

function Segmented() {
  const [v, setV] = useState<"open" | "closed">("open");
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        label="Show"
        value={v}
        onValueChange={setV}
        options={[
          { value: "open", label: "Open and in review" },
          { value: "closed", label: "Closed" },
        ]}
      />
      <p className="text-small text-ink-muted">
        Showing {v === "open" ? "open and in-review" : "closed"} tasks.
      </p>
    </div>
  );
}

export const SegmentedControlStory: Story = {
  name: "SegmentedControl",
  render: () => <Segmented />,
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function Chips() {
  const [on, setOn] = useState<Set<string>>(new Set(["Monday", "Wednesday"]));
  return (
    <ToggleChipGroup legend="Days" requirement="optional" hint="Leave all off to see every day.">
      {days.map((d) => (
        <ToggleChip
          key={d}
          label={d}
          shortLabel={d.slice(0, 3)}
          pressed={on.has(d)}
          onPressedChange={(p) => {
            const next = new Set(on);
            if (p) next.add(d);
            else next.delete(d);
            setOn(next);
          }}
        />
      ))}
    </ToggleChipGroup>
  );
}

export const ToggleChipGroupStory: Story = {
  name: "ToggleChipGroup",
  render: () => <Chips />,
};

function Slots() {
  const [chosen, setChosen] = useState<string | null>("9:30 AM");
  const slots = ["9:00 AM", "9:30 AM", "11:00 AM", "2:15 PM"];
  return (
    <Cases>
      <Case label="Open times, one selected, one taken">
        <section aria-labelledby="story-slot-day" className="flex flex-col gap-2">
          <h4 id="story-slot-day" className="text-label font-semibold">
            Friday, November 20 (Mountain Time)
          </h4>
          <ul className="flex flex-wrap gap-2">
            {slots.map((t) => (
              <li key={t}>
                <SlotButton
                  time={t}
                  fullLabel={`Friday, November 20, ${t}`}
                  selected={chosen === t}
                  onClick={() => setChosen(t)}
                />
              </li>
            ))}
            <li>
              <SlotButton time="3:00 PM" fullLabel="Friday, November 20, 3:00 PM" disabled />
            </li>
          </ul>
        </section>
      </Case>
    </Cases>
  );
}

export const SlotButtonStory: Story = {
  name: "SlotButton",
  render: () => <Slots />,
};
