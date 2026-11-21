"use client";

import {
  Button,
  Checkbox,
  FieldGroup,
  IconButton,
  Tag,
  TextInput,
  Textarea,
  FieldError,
} from "@carepath/ui";
import { weekdayLabels } from "../../../_lib/format";
import type { ExerciseMeta, ItemState } from "./builder-state";

const fullDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      <TextInput
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-24"
      />
      {hint ? (
        <span id={`${id}-hint`} className="sr-only">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/** One exercise in the plan: dose, weekly schedule, instructions, and move buttons (no drag). */
export function ItemEditor({
  index,
  count,
  item,
  meta,
  error,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  item: ItemState;
  meta: ExerciseMeta | undefined;
  error: string | undefined;
  onChange: (patch: Partial<ItemState>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const name = meta?.name ?? "Exercise";
  const id = `item-${item.exerciseId}`;
  return (
    <li
      aria-label={`${index + 1}. ${name}`}
      className="flex flex-col gap-3 rounded-container border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-label font-semibold text-ink">
            {index + 1}. {name}
          </h3>
          {meta ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Tag>{meta.bodyArea}</Tag>
              <Tag>{meta.category}</Tag>
            </div>
          ) : null}
        </div>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label={`Order and removal for ${name}`}
        >
          <IconButton
            id={`move-up-${item.exerciseId}`}
            label={`Move ${name} up`}
            icon="arrow-up"
            size="sm"
            variant="secondary"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          />
          <IconButton
            id={`move-down-${item.exerciseId}`}
            label={`Move ${name} down`}
            icon="arrow-down"
            size="sm"
            variant="secondary"
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          />
          <Button
            variant="quiet"
            size="sm"
            onClick={onRemove}
            aria-label={`Remove ${name} from the plan`}
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <NumberField
          id={`${id}-sets`}
          label="Sets"
          value={item.sets}
          onChange={(v) => onChange({ sets: v })}
        />
        <NumberField
          id={`${id}-reps`}
          label="Repetitions"
          value={item.reps}
          onChange={(v) => onChange({ reps: v })}
        />
        <NumberField
          id={`${id}-hold`}
          label="Hold (seconds)"
          value={item.holdSeconds}
          onChange={(v) => onChange({ holdSeconds: v })}
        />
        <NumberField
          id={`${id}-duration`}
          label="Duration (seconds)"
          value={item.durationSeconds}
          onChange={(v) => onChange({ durationSeconds: v })}
        />
        <NumberField
          id={`${id}-rest`}
          label="Rest (seconds)"
          value={item.restSeconds}
          onChange={(v) => onChange({ restSeconds: v })}
        />
      </div>

      <FieldGroup
        legend="Weekly schedule"
        requirement="required"
        hint="Days this exercise is due. The patient sees them as set by the care team."
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {weekdayLabels.map((label, day) => (
            <Checkbox
              key={day}
              label={label}
              aria-label={fullDay[day] ?? label}
              checked={item.days.includes(day)}
              onCheckedChange={(checked) =>
                onChange({
                  days: checked === true ? [...item.days, day] : item.days.filter((d) => d !== day),
                })
              }
              id={`${id}-day-${day}`}
            />
          ))}
          <div className="ml-2 flex items-center gap-2">
            <label htmlFor={`${id}-times`} className="text-small font-medium text-ink">
              Times per day
            </label>
            <TextInput
              id={`${id}-times`}
              type="number"
              inputMode="numeric"
              min={1}
              max={6}
              value={item.timesPerDay}
              onChange={(e) => onChange({ timesPerDay: e.target.value })}
              className="w-20"
            />
          </div>
        </div>
      </FieldGroup>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-notes`} className="text-small font-medium text-ink">
          Instructions for the patient (optional)
        </label>
        <Textarea
          id={`${id}-notes`}
          rows={2}
          maxLength={1000}
          value={item.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
        />
      </div>

      {error ? <FieldError live>{error}</FieldError> : null}
    </li>
  );
}
