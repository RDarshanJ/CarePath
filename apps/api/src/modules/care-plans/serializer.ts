import { EXERCISE_CONTENT_NOTICE } from "@carepath/shared";
import type {
  CarePlanDiff,
  CarePlanItem,
  CarePlanView,
  PersonRef,
} from "@carepath/shared/contracts";

/**
 * The one patient-facing plan serializer (REQ-PLN-05). The patient plan endpoints, version
 * detail and the clinician's draft preview all call renderCarePlanView, so a preview cannot
 * differ from what the patient will see.
 */
export interface PlanRenderItem {
  assignmentId: string | null;
  position: number;
  exercise: CarePlanItem["exercise"];
  dose: CarePlanItem["dose"];
  schedule: CarePlanItem["schedule"];
  clinicianInstructions: string | null;
}

export interface PlanRenderGoal {
  id: string | null;
  description: string;
  targetValue: number | null;
  targetUnit: string | null;
  dueDate: string | null;
}

export interface PlanRenderInput {
  carePlanId: string;
  preview: boolean;
  title: string;
  instructions: string;
  version: {
    id: string | null;
    number: number;
    publishedAt: Date | null;
    publishedBy: PersonRef;
    changeNoteForPatient: string | null;
    isCurrent: boolean;
  };
  items: PlanRenderItem[];
  goals: PlanRenderGoal[];
  /** Items of the version before this one, or null for version 1. */
  previous: { number: number; items: PlanRenderItem[] } | null;
}

const comparedFields = [
  ["sets", (i: PlanRenderItem) => i.dose.sets],
  ["reps", (i: PlanRenderItem) => i.dose.reps],
  ["holdSeconds", (i: PlanRenderItem) => i.dose.holdSeconds],
  ["durationSeconds", (i: PlanRenderItem) => i.dose.durationSeconds],
  ["restSeconds", (i: PlanRenderItem) => i.dose.restSeconds],
  ["daysOfWeek", (i: PlanRenderItem) => [...i.schedule.daysOfWeek].sort().join(",")],
  ["timesPerDay", (i: PlanRenderItem) => i.schedule.timesPerDay],
  ["instructions", (i: PlanRenderItem) => i.clinicianInstructions ?? ""],
] as const;

/** Added, removed and changed exercises between two item lists, by exercise (AC-B3). */
export function diffItems(
  previousNumber: number,
  before: PlanRenderItem[],
  after: PlanRenderItem[],
): CarePlanDiff {
  const prev = new Map(before.map((i) => [i.exercise.id, i]));
  const next = new Map(after.map((i) => [i.exercise.id, i]));
  const ref = (i: PlanRenderItem) => ({ exerciseId: i.exercise.id, name: i.exercise.name });
  const changed: CarePlanDiff["changed"] = [];
  for (const item of after) {
    const old = prev.get(item.exercise.id);
    if (!old) continue;
    const fields = comparedFields.filter(([, get]) => get(old) !== get(item)).map(([f]) => f);
    if (fields.length > 0) changed.push({ ...ref(item), fields });
  }
  return {
    previousVersionNumber: previousNumber,
    added: after.filter((i) => !prev.has(i.exercise.id)).map(ref),
    removed: before.filter((i) => !next.has(i.exercise.id)).map(ref),
    changed,
  };
}

export function renderCarePlanView(input: PlanRenderInput): CarePlanView {
  const items = [...input.items].sort((a, b) => a.position - b.position);
  return {
    carePlanId: input.carePlanId,
    preview: input.preview,
    title: input.title,
    instructions: input.instructions,
    version: {
      id: input.version.id,
      number: input.version.number,
      publishedAt: input.version.publishedAt?.toISOString() ?? null,
      publishedBy: input.version.publishedBy,
      changeNoteForPatient: input.version.changeNoteForPatient,
      isCurrent: input.version.isCurrent,
    },
    items: items.map((i) => ({
      assignmentId: i.assignmentId,
      position: i.position,
      exercise: i.exercise,
      dose: i.dose,
      schedule: { daysOfWeek: [...i.schedule.daysOfWeek], timesPerDay: i.schedule.timesPerDay },
      clinicianInstructions: i.clinicianInstructions,
    })),
    goals: input.goals.map((g) => ({ ...g })),
    diffFromPrevious: input.previous
      ? diffItems(input.previous.number, input.previous.items, items)
      : null,
    contentNotice: EXERCISE_CONTENT_NOTICE,
  };
}
