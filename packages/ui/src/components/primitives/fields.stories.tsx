import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases, Row } from "../../stories/helpers";
import { Field, FieldError, FieldGroup, RequirementWord } from "./field";
import { Textarea, TextInput } from "./inputs";
import { Select } from "./select";
import { Checkbox } from "./choice";

const meta = { title: "Primitives/Fields" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const FieldStory: Story = {
  name: "Field",
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <Field
        label="Preferred name"
        requirement="required"
        why="Your care team uses this name when they message you."
      >
        {(c) => <TextInput {...c} defaultValue="Avery" autoComplete="given-name" />}
      </Field>
      <Field label="Phone" requirement="optional" hint="For example, (555) 010-0199.">
        {(c) => <TextInput {...c} inputMode="tel" autoComplete="tel" />}
      </Field>
      <Field
        label="Hold time"
        requirement="required"
        hint="From 5 to 120."
        error="Enter a hold time from 5 to 120 seconds"
      >
        {(c) => <TextInput {...c} defaultValue="300" inputMode="numeric" unit="seconds" />}
      </Field>
      <Field label="Clinic" requirement="required">
        {(c) => <TextInput {...c} defaultValue="Northside Physical Therapy (demo)" readOnly />}
      </Field>
      <Field label="Referral code" requirement="optional">
        {(c) => <TextInput {...c} defaultValue="Not available" disabled />}
      </Field>
      <Field
        label="Hidden label, same words shown beside the control"
        requirement="optional"
        hideLabel
      >
        {(c) => <TextInput {...c} defaultValue="Visible text next to the field" />}
      </Field>
    </div>
  ),
};

export const FieldErrorStory: Story = {
  name: "FieldError",
  render: () => (
    <Cases>
      <Case label="Inline error">
        <FieldError>Select a side</FieldError>
      </Case>
      <Case label="Announced as it appears">
        <FieldError live>Your note could not be saved</FieldError>
      </Case>
    </Cases>
  ),
};

export const RequirementWordStory: Story = {
  name: "RequirementWord",
  render: () => (
    <Row>
      <span className="text-label font-medium">
        Preferred name <RequirementWord requirement="required" />
      </span>
      <span className="text-label font-medium">
        Phone <RequirementWord requirement="optional" />
      </span>
    </Row>
  ),
};

export const FieldGroupStory: Story = {
  name: "FieldGroup",
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <FieldGroup
        legend="Movements that are hard for you"
        requirement="optional"
        hint="Select all that apply."
      >
        <Checkbox label="Kneeling" />
        <Checkbox label="Stairs" defaultChecked />
        <Checkbox label="Lifting" />
      </FieldGroup>
      <FieldGroup legend="Which side?" requirement="required" error="Select a side">
        <Checkbox label="Left side" />
        <Checkbox label="Right side" />
      </FieldGroup>
    </div>
  ),
};

export const TextInputStory: Story = {
  name: "TextInput",
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <Case label="Default">
        <TextInput aria-label="Default" placeholder="Name or MRN" />
      </Case>
      <Case label="With a unit">
        <TextInput
          aria-label="Repetitions"
          inputMode="numeric"
          unit="reps"
          defaultValue="12"
          className="max-w-24"
        />
      </Case>
      <Case label="Forced hover and focus">
        <Row>
          <TextInput
            aria-label="Hover state"
            data-demo="hover"
            defaultValue="Hover"
            className="max-w-40"
          />
          <TextInput
            aria-label="Focus state"
            data-demo="focus"
            defaultValue="Focus"
            className="max-w-40"
          />
        </Row>
      </Case>
      <Case label="Invalid">
        <TextInput aria-label="Hold time" aria-invalid defaultValue="300" />
      </Case>
      <Case label="Read only and disabled">
        <TextInput aria-label="Clinic" defaultValue="Northside Physical Therapy (demo)" readOnly />
        <TextInput aria-label="Referral code" defaultValue="Not available" disabled />
      </Case>
    </div>
  ),
};

function CountedNote() {
  const [text, setText] = useState("Knee felt stiff on the stairs this morning. ".repeat(4));
  return (
    <Field
      label="Note for your care team"
      requirement="optional"
      hint="Do not use this for emergencies."
      count={{ length: text.length, max: 200 }}
    >
      {(c) => (
        <Textarea {...c} value={text} maxLength={240} onChange={(e) => setText(e.target.value)} />
      )}
    </Field>
  );
}

export const TextareaStory: Story = {
  name: "Textarea",
  render: () => (
    <div className="flex max-w-md flex-col gap-5">
      <CountedNote />
      <Field label="Message to your therapist" requirement="required" error="Write a message first">
        {(c) => <Textarea {...c} rows={3} />}
      </Field>
      <Field label="Closed note" requirement="optional">
        {(c) => <Textarea {...c} rows={2} defaultValue="Resolved by phone." disabled />}
      </Field>
    </div>
  ),
};

export const SelectStory: Story = {
  name: "Select",
  render: () => (
    <div className="flex max-w-xs flex-col gap-5">
      <Field label="Rows per page" requirement="optional">
        {(c) => (
          <Select
            {...c}
            defaultValue="25"
            options={[
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
          />
        )}
      </Field>
      <Field label="Status" requirement="required" error="Choose a status">
        {(c) => (
          <Select
            {...c}
            placeholder="Choose one"
            options={[
              { value: "active", label: "Active" },
              { value: "intake", label: "Intake incomplete" },
            ]}
          />
        )}
      </Field>
      <Field label="Clinic" requirement="optional">
        {(c) => (
          <Select
            {...c}
            disabled
            defaultValue="north"
            options={[{ value: "north", label: "Northside (demo)" }]}
          />
        )}
      </Field>
    </div>
  ),
};
