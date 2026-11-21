"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  daysText,
  doseText,
  formatDate,
  formatTime,
  restText,
  scheduleText,
  versionMarkerLabels,
  weekdayNames,
  weekdayOrder,
} from "@carepath/shared";
import type { CarePlanDiff, CarePlanVersionList, Dose, Schedule } from "@carepath/shared/contracts";
import { cx } from "../../lib/cx";
import { Banner } from "../composed/banner";
import { Button, IconButton } from "../primitives/button";
import { Checkbox } from "../primitives/choice";
import { Field, FieldGroup } from "../primitives/field";
import { Icon } from "../primitives/icons";
import { TextInput, Textarea } from "../primitives/inputs";
import { Skeleton } from "../primitives/surfaces";
import { Tag } from "../primitives/status";
import {
  PLAN_DIFF_SCOPE,
  diffCountsText,
  diffFieldText,
  moveButtonLabel,
  planStateKind,
  planStateTag,
  positionText,
  type DiffCounts,
  type PlanAudience,
} from "./plan-text";

/*
 * Treatment planning (CD-300 to CD-305). Presentation only: the builder owns the draft, autosave and
 * publishing; these components render what they are given and report edits through callbacks.
 */

export interface ExerciseInfo {
  name: string;
  bodyArea: string;
  category: string;
  instructions?: string | null;
  mediaPath?: string | null;
  mediaAlt?: string | null;
}

export type ExerciseSummaryVariant = "library" | "plan" | "editor" | "session-overview";

export interface ExerciseSummaryProps {
  exercise: ExerciseInfo;
  variant: ExerciseSummaryVariant;
  /** Who reads it: patient wording for the dose and days (`plan` and `session-overview` default). */
  audience?: PlanAudience;
  dose?: Dose;
  schedule?: Schedule;
  /** The clinician's note for this exercise, shown to the patient. */
  clinicianInstructions?: string | null;
  /** The parent list sets the level. */
  headingAs?: "h2" | "h3" | "h4" | "p";
  /** Library: add to the plan. With `inPlan` the action reads "In the plan" and is unavailable. */
  onAdd?: () => void;
  inPlan?: boolean;
  /** Trailing actions for other variants (move, remove, edit). */
  action?: ReactNode;
  className?: string;
}

/**
 * One row for an exercise anywhere it is listed (CD-300): decorative picture when there is one, name,
 * body area and category in words, dose and days, the therapist's note, and the instructions behind a
 * disclosure. Long names wrap; nothing is truncated with a `title`.
 */
export function ExerciseSummary({
  exercise,
  variant,
  audience = variant === "library" || variant === "editor" ? "staff" : "patient",
  dose,
  schedule,
  clinicianInstructions,
  headingAs: Name = "h3",
  onAdd,
  inPlan = false,
  action,
  className,
}: ExerciseSummaryProps) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const reasonId = useId();
  const patient = audience === "patient";
  const doseLine = dose ? (patient ? doseText(dose, { rest: false }) : doseText(dose)) : null;
  const daysLine = schedule
    ? patient
      ? `${daysText(schedule.daysOfWeek)}${schedule.timesPerDay > 1 ? `, ${schedule.timesPerDay} times a day` : ""}`
      : scheduleText(schedule.daysOfWeek, schedule.timesPerDay)
    : null;
  return (
    <div data-variant={variant} className={cx("flex min-w-0 gap-3", className)}>
      {exercise.mediaPath ? (
        // Decorative: the name is next to it (CD-300). Alt text describes, never instructs.
        <img
          src={exercise.mediaPath}
          alt=""
          className={cx(
            "shrink-0 rounded-control bg-surface-sunken object-contain",
            patient ? "size-20" : "size-14",
          )}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <Name
              className={cx(
                "font-semibold break-words text-ink",
                patient ? "text-h4" : "text-label",
              )}
            >
              {exercise.name}
            </Name>
            <p className="text-small text-ink-muted">
              {exercise.bodyArea}, {exercise.category}
            </p>
          </div>
          {variant === "library" && onAdd ? (
            <div className="flex flex-col items-end gap-0.5">
              <Button
                variant="secondary"
                size="sm"
                iconLeft={inPlan ? "check" : "plus"}
                unavailable={inPlan}
                aria-describedby={inPlan ? reasonId : undefined}
                aria-label={
                  inPlan ? `${exercise.name} is in the plan` : `Add ${exercise.name} to the plan`
                }
                onClick={onAdd}
              >
                {inPlan ? "In the plan" : "Add"}
              </Button>
              {inPlan ? (
                <span id={reasonId} className="sr-only">
                  Each exercise can be in the plan once.
                </span>
              ) : null}
            </div>
          ) : action ? (
            <div className="flex flex-wrap items-center gap-2">{action}</div>
          ) : null}
        </div>
        {doseLine ? <p className="text-body text-ink">{doseLine}</p> : null}
        {patient && dose ? <p className="text-small text-ink-muted">{restText(dose)}</p> : null}
        {daysLine ? <p className="text-small text-ink-muted">{daysLine}</p> : null}
        {clinicianInstructions ? (
          <p className="max-w-measure text-small text-ink">
            <span className="font-medium">
              {patient ? "From your therapist: " : "Note to the patient: "}
            </span>
            {clinicianInstructions}
          </p>
        ) : null}
        {exercise.instructions ? (
          <div>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailId}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex min-h-target items-center gap-1 rounded-control text-label font-medium text-link hover:text-primary-hover focus-visible:focus-ring"
            >
              {open ? "Hide instructions" : "Show instructions"}
              <span className="sr-only"> for {exercise.name}</span>
              <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
            </button>
            <p
              id={detailId}
              hidden={!open}
              className="max-w-measure pt-1 text-small whitespace-pre-line text-ink"
            >
              {exercise.instructions}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface MoveButtonsProps {
  name: string;
  /** 0-based index in the list. */
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  disabled?: boolean;
}

/**
 * Move up and move down with the position in words (CD-302, WCAG 2.5.7). After a move, focus stays on
 * the same direction button of the moved item, or the other button when the item reached an end. At
 * the ends the button is unavailable with the reason as its description. The parent announces the new
 * position with `moveAnnouncement` in its one live region.
 */
export function MoveButtons({ name, index, total, onMove, disabled = false }: MoveButtonsProps) {
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);
  const pending = useRef<"up" | "down" | null>(null);
  const firstId = useId();
  const lastId = useId();
  const first = index === 0;
  const last = index === total - 1;
  useLayoutEffect(() => {
    const dir = pending.current;
    if (!dir) return;
    pending.current = null;
    const target = dir === "up" ? (first ? down : up) : last ? up : down;
    target.current?.focus();
  }, [index, first, last]);
  const move = (dir: "up" | "down") => {
    if (disabled || (dir === "up" && first) || (dir === "down" && last)) return;
    pending.current = dir;
    onMove(dir);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-small whitespace-nowrap text-ink-muted">
        {positionText(index + 1, total)}
      </span>
      <IconButton
        ref={up}
        icon="arrow-up"
        variant="neutral"
        label={moveButtonLabel(name, "up", index + 1, total)}
        unavailable={first || disabled}
        aria-describedby={first ? firstId : undefined}
        onClick={() => move("up")}
      />
      <IconButton
        ref={down}
        icon="arrow-down"
        variant="neutral"
        label={moveButtonLabel(name, "down", index + 1, total)}
        unavailable={last || disabled}
        aria-describedby={last ? lastId : undefined}
        onClick={() => move("down")}
      />
      <span id={firstId} className="sr-only">
        First in the plan
      </span>
      <span id={lastId} className="sr-only">
        Last in the plan
      </span>
    </div>
  );
}

export interface DoseDraft {
  dose: Dose;
  schedule: Schedule;
  instructions: string | null;
}

export type DoseErrorKey =
  | "dose"
  | "sets"
  | "reps"
  | "holdSeconds"
  | "durationSeconds"
  | "restSeconds"
  | "daysOfWeek"
  | "timesPerDay"
  | "instructions";

export interface DoseEditorRowProps {
  exercise: ExerciseInfo;
  value: DoseDraft;
  /** Field-level and group messages from the builder's validation. */
  errors?: Partial<Record<DoseErrorKey, string>>;
  onChange: (next: DoseDraft) => void;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  /** Read-only roles see the summary only. */
  readOnly?: boolean;
  defaultOpen?: boolean;
  /** Prefix for field ids so an ErrorSummary can link to them. */
  idPrefix?: string;
}

const INSTRUCTIONS_MAX = 1000;
const numberFields = [
  { key: "sets", label: "Sets", unit: "sets", nullable: true },
  { key: "reps", label: "Repetitions", unit: "repetitions", nullable: true },
  { key: "holdSeconds", label: "Hold, in seconds", unit: "seconds", nullable: true },
  { key: "durationSeconds", label: "Duration, in seconds", unit: "seconds", nullable: true },
  { key: "restSeconds", label: "Rest between sets, in seconds", unit: "seconds", nullable: false },
] as const;

function toNumber(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

/**
 * The builder's row for one exercise (CD-301): the summary line the patient will read, an "Edit dose"
 * disclosure with typed, labelled fields (no slider, no stepper), days, times per day, the note to the
 * patient, and the move and remove controls. The disclosure keeps focus on its own button.
 */
export function DoseEditorRow({
  exercise,
  value,
  errors = {},
  onChange,
  index,
  total,
  onMove,
  onRemove,
  readOnly = false,
  defaultOpen = false,
  idPrefix,
}: DoseEditorRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const auto = useId();
  const prefix = idPrefix ?? auto;
  const panelId = `${prefix}-panel`;
  const [text, setText] = useState<Record<string, string>>(() =>
    Object.fromEntries(numberFields.map((f) => [f.key, value.dose[f.key]?.toString() ?? ""])),
  );
  const [times, setTimes] = useState(String(value.schedule.timesPerDay));
  const hasErrors = Object.values(errors).some(Boolean);
  const setDose = (key: (typeof numberFields)[number]["key"], raw: string) => {
    setText((t) => ({ ...t, [key]: raw }));
    const n = toNumber(raw);
    onChange({ ...value, dose: { ...value.dose, [key]: key === "restSeconds" ? (n ?? 0) : n } });
  };
  const toggleDay = (day: number, on: boolean) => {
    const days = on
      ? [...new Set([...value.schedule.daysOfWeek, day])]
      : value.schedule.daysOfWeek.filter((d) => d !== day);
    onChange({ ...value, schedule: { ...value.schedule, daysOfWeek: days.sort((a, b) => a - b) } });
  };
  const summary = doseText(value.dose) || "No dose set";
  return (
    <div
      data-dose-row=""
      className={cx(
        "flex flex-col gap-3 rounded-container border bg-surface p-3",
        hasErrors ? "border-error-ink" : "border-border",
      )}
    >
      <ExerciseSummary
        exercise={{ ...exercise, instructions: null }}
        variant="editor"
        headingAs="h3"
        action={
          readOnly ? undefined : (
            <MoveButtons name={exercise.name} index={index} total={total} onMove={onMove} />
          )
        }
      />
      <div className="flex flex-col gap-0.5">
        <p className="text-body text-ink">{summary}</p>
        <p className="text-small text-ink-muted">
          {value.schedule.daysOfWeek.length
            ? scheduleText(value.schedule.daysOfWeek, value.schedule.timesPerDay)
            : "No days chosen"}
        </p>
        {errors.dose ? (
          <p className="flex items-center gap-1.5 text-small font-medium text-error-ink">
            <Icon name="alert-circle" size={16} />
            <span>
              <span className="sr-only">Error: </span>
              {errors.dose}
            </span>
          </p>
        ) : null}
      </div>
      {readOnly ? null : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="neutral"
              size="sm"
              aria-expanded={open}
              aria-controls={panelId}
              iconRight={open ? "chevron-up" : "chevron-down"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Close dose editor" : "Edit dose"}
              <span className="sr-only"> for {exercise.name}</span>
            </Button>
            <Button variant="quiet" size="sm" onClick={onRemove}>
              Remove<span className="sr-only"> {exercise.name}</span>
            </Button>
          </div>
          <div
            id={panelId}
            hidden={!open}
            className="flex flex-col gap-4 border-t border-border pt-3"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {numberFields.map((f) => (
                <Field
                  key={f.key}
                  id={`${prefix}-${f.key}`}
                  label={f.label}
                  requirement={f.nullable ? "optional" : "required"}
                  error={errors[f.key]}
                >
                  {(c) => (
                    <TextInput
                      {...c}
                      inputMode="numeric"
                      autoComplete="off"
                      value={text[f.key] ?? ""}
                      onChange={(e) => setDose(f.key, e.target.value)}
                    />
                  )}
                </Field>
              ))}
              <Field
                id={`${prefix}-timesPerDay`}
                label="Times per day"
                requirement="required"
                error={errors.timesPerDay}
              >
                {(c) => (
                  <TextInput
                    {...c}
                    inputMode="numeric"
                    autoComplete="off"
                    value={times}
                    onChange={(e) => {
                      setTimes(e.target.value);
                      const n = toNumber(e.target.value);
                      if (n != null)
                        onChange({ ...value, schedule: { ...value.schedule, timesPerDay: n } });
                    }}
                  />
                )}
              </Field>
            </div>
            <FieldGroup
              legend="Days"
              requirement="required"
              error={errors.daysOfWeek}
              id={`${prefix}-days`}
            >
              <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-4 xl:grid-cols-7">
                {weekdayOrder.map((d) => (
                  <Checkbox
                    key={d}
                    id={d === 1 ? `${prefix}-daysOfWeek` : undefined}
                    label={weekdayNames[d]}
                    checked={value.schedule.daysOfWeek.includes(d)}
                    onCheckedChange={(v) => toggleDay(d, v === true)}
                  />
                ))}
              </div>
            </FieldGroup>
            <Field
              id={`${prefix}-instructions`}
              label="Note to the patient"
              requirement="optional"
              hint="Shown with this exercise in the patient's plan."
              error={errors.instructions}
              count={{ length: value.instructions?.length ?? 0, max: INSTRUCTIONS_MAX }}
            >
              {(c) => (
                <Textarea
                  {...c}
                  rows={3}
                  value={value.instructions ?? ""}
                  onChange={(e) => onChange({ ...value, instructions: e.target.value || null })}
                />
              )}
            </Field>
          </div>
        </>
      )}
    </div>
  );
}

export interface PlanDiffProps {
  /** Null for version 1. */
  diff: CarePlanDiff | null;
  audience: PlanAudience;
  heading?: string;
  headingAs?: "h3" | "h4" | "p";
  className?: string;
}

function DiffGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label font-semibold text-ink">{title}</p>
      <ul className="flex list-disc flex-col gap-0.5 pl-5 text-body text-ink">{children}</ul>
    </div>
  );
}

/**
 * What a version added, removed or changed (CD-304), in words with group labels, never colour. The
 * field words follow the audience; staff also get the scope sentence, so an empty list is not read as
 * "no change".
 */
export function PlanDiff({
  diff,
  audience,
  heading,
  headingAs: H = "h3",
  className,
}: PlanDiffProps) {
  const staff = audience === "staff";
  return (
    <div className={cx("flex flex-col gap-3", className)}>
      {heading ? <H className="text-label font-semibold text-ink">{heading}</H> : null}
      {!diff ? (
        <p className="text-body text-ink">First version. There is no earlier version to compare.</p>
      ) : diff.added.length + diff.removed.length + diff.changed.length === 0 ? (
        <p className="text-body text-ink">No exercises were added, removed or changed.</p>
      ) : (
        <>
          {diff.added.length ? (
            <DiffGroup title={`Added (${diff.added.length})`}>
              {diff.added.map((e) => (
                <li key={e.exerciseId}>{e.name}</li>
              ))}
            </DiffGroup>
          ) : null}
          {diff.removed.length ? (
            <DiffGroup title={`Removed (${diff.removed.length})`}>
              {diff.removed.map((e) => (
                <li key={e.exerciseId}>{e.name}</li>
              ))}
            </DiffGroup>
          ) : null}
          {diff.changed.length ? (
            <DiffGroup title={`Changed (${diff.changed.length})`}>
              {diff.changed.map((e) => (
                <li key={e.exerciseId}>
                  {e.name}
                  {e.fields.length ? (
                    <span className="text-ink-muted">
                      : {e.fields.map((f) => diffFieldText(f, audience)).join(", ")}
                    </span>
                  ) : null}
                </li>
              ))}
            </DiffGroup>
          ) : null}
        </>
      )}
      {staff && diff ? <p className="text-small text-ink-muted">{PLAN_DIFF_SCOPE}</p> : null}
    </div>
  );
}

export type PlanVersion = CarePlanVersionList["items"][number];

export interface VersionListProps {
  versions: PlanVersion[];
  audience: PlanAudience;
  /** Clinic zone for dates. */
  timezone: string;
  /** Diff per version id, when the detail has been read. `null` for version 1. */
  diffs?: Record<string, CarePlanDiff | null | undefined>;
  /** Read-only view of one version. */
  onView?: (versionId: string) => void;
  state?: "ready" | "loading" | "error";
  onRetry?: () => void;
  headingAs?: "h2" | "h3";
}

/**
 * Published versions, newest first (CD-303): state Tag, date, author (staff only), the patient-facing
 * note, a "What changed" disclosure with `PlanDiff`, and a read-only view. No restore: none exists.
 */
export function VersionList({
  versions,
  audience,
  timezone,
  diffs = {},
  onView,
  state = "ready",
  onRetry,
  headingAs: H = "h2",
}: VersionListProps) {
  const sorted = [...versions].sort((a, b) => b.number - a.number);
  const staff = audience === "staff";
  return (
    <section className="flex flex-col gap-3" aria-busy={state === "loading" || undefined}>
      <H className="text-h3 font-semibold text-ink">
        Versions{state === "ready" && sorted.length ? ` (${sorted.length})` : ""}
      </H>
      {state === "loading" ? (
        <div className="flex flex-col gap-2">
          <p className="sr-only">Loading versions</p>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : state === "error" ? (
        <Banner
          tone="error"
          title="Versions could not be loaded"
          action={
            onRetry ? (
              <Button variant="neutral" size="sm" onClick={onRetry}>
                Try again
              </Button>
            ) : undefined
          }
        >
          The plan itself is unchanged.
        </Banner>
      ) : sorted.length === 0 ? (
        <p className="text-body text-ink">No version has been published.</p>
      ) : (
        <>
          {sorted.length === 1 ? (
            <p className="text-small text-ink-muted">Version 1. No earlier versions.</p>
          ) : null}
          <ol className="flex flex-col gap-2">
            {sorted.map((v) => (
              <VersionEntry
                key={v.id}
                v={v}
                staff={staff}
                timezone={timezone}
                diff={v.id in diffs ? diffs[v.id] : undefined}
                onView={onView}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

function VersionEntry({
  v,
  staff,
  timezone,
  diff,
  onView,
}: {
  v: PlanVersion;
  staff: boolean;
  timezone: string;
  diff: CarePlanDiff | null | undefined;
  onView?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const marker = versionMarkerLabels[v.isCurrent ? "current" : "earlier"];
  return (
    <li className="flex flex-col gap-2 rounded-container border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-label font-semibold text-ink">Version {v.number}</p>
        <Tag tone={marker.tone}>{marker.label}</Tag>
        <p className="text-small text-ink-muted">
          Published {formatDate(v.publishedAt, timezone)}
          {staff ? ` by ${v.publishedBy.name}` : ""}
        </p>
      </div>
      {v.changeNoteForPatient ? (
        <p className="max-w-measure text-body break-words text-ink">
          <span className="font-medium">
            {staff ? "Note to the patient: " : "Note from your care team: "}
          </span>
          {v.changeNoteForPatient}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {diff !== undefined ? (
          <Button
            variant="quiet"
            size="sm"
            aria-expanded={open}
            aria-controls={id}
            iconRight={open ? "chevron-up" : "chevron-down"}
            onClick={() => setOpen((o) => !o)}
          >
            What changed in version {v.number}
          </Button>
        ) : null}
        {onView ? (
          <Button variant="neutral" size="sm" onClick={() => onView(v.id)}>
            View version {v.number}
          </Button>
        ) : null}
      </div>
      {diff !== undefined ? (
        <div id={id} hidden={!open} className="border-t border-border pt-2">
          <PlanDiff diff={diff} audience={staff ? "staff" : "patient"} />
        </div>
      ) : null}
    </li>
  );
}

export interface PlanStateLineProps {
  audience: PlanAudience;
  /** The published version the patient sees, or null. */
  currentVersion: number | null;
  /** The unpublished draft, if any: when it was saved and how it differs. */
  draft?: { updatedAt: string; counts: DiffCounts } | null;
  /** A version being viewed read-only; an earlier one reads "Earlier version". */
  viewingVersion?: number | null;
  timezone: string;
  state?: "ready" | "loading" | "error" | "stale";
  onRetry?: () => void;
  className?: string;
}

/**
 * One sentence and one Tag that say what the patient sees and whether unpublished work exists (CD-305).
 * Words: Draft; Published, version N; Draft differs from version N; Earlier version. Patients see
 * "Current plan, version N" or "Earlier version" and never the word Draft.
 */
export function PlanStateLine({
  audience,
  currentVersion,
  draft = null,
  viewingVersion,
  timezone,
  state = "ready",
  onRetry,
  className,
}: PlanStateLineProps) {
  if (state === "loading") {
    return (
      <div className={cx("flex items-center gap-2", className)} aria-busy="true">
        <span className="sr-only">Loading plan state</span>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }
  if (state === "error") {
    return (
      <p className={cx("flex flex-wrap items-center gap-2 text-small text-error-ink", className)}>
        <Icon name="alert-circle" size={16} />
        Plan state could not be loaded.
        {onRetry ? (
          <Button variant="neutral" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </p>
    );
  }
  const patient = audience === "patient";
  const kind = planStateKind({ currentVersion, hasDraft: !patient && !!draft, viewingVersion });
  const tag = planStateTag(
    kind,
    audience,
    kind === "earlier" ? (viewingVersion ?? null) : currentVersion,
  );
  let sentence: string;
  if (patient) {
    sentence =
      kind === "earlier"
        ? `You are looking at version ${viewingVersion}. Your current plan is version ${currentVersion}.`
        : currentVersion == null
          ? "Your care team has not published a plan yet."
          : "This is the plan your care team published for you.";
  } else {
    switch (kind) {
      case "none":
        sentence = "No plan yet.";
        break;
      case "draft":
        sentence = "Nothing is published. The patient sees no plan.";
        break;
      case "published":
        sentence = `The patient sees version ${currentVersion}. No unpublished changes.`;
        break;
      case "draft_differs":
        sentence = `The patient sees version ${currentVersion}. Draft: ${diffCountsText(draft!.counts)}.`;
        break;
      case "earlier":
        sentence = `You are viewing version ${viewingVersion}, read only. The patient sees version ${currentVersion}.`;
        break;
    }
  }
  return (
    <div
      className={cx("flex flex-wrap items-center gap-x-3 gap-y-1", className)}
      data-plan-state={kind}
    >
      {tag ? (
        <Tag tone={kind === "draft_differs" || kind === "draft" ? "info" : "neutral"}>{tag}</Tag>
      ) : null}
      <p className="text-small text-ink">{sentence}</p>
      {!patient && draft && (kind === "draft" || kind === "draft_differs") ? (
        <p role="status" className="text-small text-ink-muted">
          Saved {formatTime(draft.updatedAt, timezone)}
        </p>
      ) : null}
      {state === "stale" ? (
        <p className="flex items-center gap-1.5 text-small text-warning-ink">
          <Icon name="alert-triangle" size={16} />
          This draft was saved somewhere else. Reload to see the latest version.
        </p>
      ) : null}
    </div>
  );
}
