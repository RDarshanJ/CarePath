import {
  carePlanDraftContentSchema,
  type CarePlanDraftContent,
  type CarePlanView,
  type Exercise,
} from "@carepath/shared/contracts";

/**
 * The form state of the plan builder. Number fields are kept as the text the clinician typed so a
 * half-typed value is never rewritten; `toContent` converts to the API's draft content and
 * `validate` runs the shared contract, so what the form accepts is exactly what the API accepts.
 */
export interface ExerciseMeta {
  name: string;
  bodyArea: string;
  category: string;
  description: string;
}

export interface ItemState {
  exerciseId: string;
  sets: string;
  reps: string;
  holdSeconds: string;
  durationSeconds: string;
  restSeconds: string;
  days: number[];
  timesPerDay: string;
  instructions: string;
}

export interface GoalState {
  /** Stable key for React; unrelated to the goal's id. */
  key: string;
  id: string | null;
  description: string;
  targetValue: string;
  targetUnit: string;
  dueDate: string;
}

export interface DraftState {
  title: string;
  instructions: string;
  items: ItemState[];
  goals: GoalState[];
}

export const emptyDraft: DraftState = { title: "", instructions: "", items: [], goals: [] };

const text = (n: number | null) => (n === null ? "" : String(n));
const num = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
};

let goalCounter = 0;
export const newGoalKey = () => `goal-${++goalCounter}`;

export function fromContent(content: CarePlanDraftContent): DraftState {
  return {
    title: content.title,
    instructions: content.instructions,
    items: content.items.map((i) => ({
      exerciseId: i.exerciseId,
      sets: text(i.dose.sets),
      reps: text(i.dose.reps),
      holdSeconds: text(i.dose.holdSeconds),
      durationSeconds: text(i.dose.durationSeconds),
      restSeconds: text(i.dose.restSeconds),
      days: [...i.schedule.daysOfWeek],
      timesPerDay: text(i.schedule.timesPerDay),
      instructions: i.instructions ?? "",
    })),
    goals: content.goals.map((g) => ({
      key: newGoalKey(),
      id: g.id,
      description: g.description,
      targetValue: text(g.targetValue),
      targetUnit: g.targetUnit ?? "",
      dueDate: g.dueDate ?? "",
    })),
  };
}

/** Start a draft from the published plan the patient has now (no draft exists yet). */
export function fromPlanView(plan: CarePlanView): DraftState {
  return {
    title: plan.title,
    instructions: plan.instructions,
    items: plan.items.map((i) => ({
      exerciseId: i.exercise.id,
      sets: text(i.dose.sets),
      reps: text(i.dose.reps),
      holdSeconds: text(i.dose.holdSeconds),
      durationSeconds: text(i.dose.durationSeconds),
      restSeconds: text(i.dose.restSeconds),
      days: [...i.schedule.daysOfWeek],
      timesPerDay: text(i.schedule.timesPerDay),
      instructions: i.clinicianInstructions ?? "",
    })),
    goals: plan.goals.map((g) => ({
      key: newGoalKey(),
      id: g.id,
      description: g.description,
      targetValue: text(g.targetValue),
      targetUnit: g.targetUnit ?? "",
      dueDate: g.dueDate ?? "",
    })),
  };
}

export function metaFromView(plan: CarePlanView): Record<string, ExerciseMeta> {
  return Object.fromEntries(
    plan.items.map((i) => [
      i.exercise.id,
      {
        name: i.exercise.name,
        bodyArea: i.exercise.bodyArea,
        category: i.exercise.category,
        description: i.exercise.description,
      },
    ]),
  );
}

/** A new item from the library, using the exercise's suggested dose. */
export function itemFromExercise(e: Exercise): ItemState {
  return {
    exerciseId: e.id,
    sets: text(e.defaults.sets ?? 2),
    reps: text(e.defaults.reps),
    holdSeconds: text(e.defaults.holdSeconds),
    durationSeconds: text(e.defaults.durationSeconds),
    restSeconds: "30",
    days: [1, 3, 5],
    timesPerDay: "1",
    instructions: "",
  };
}

export function toContent(state: DraftState): CarePlanDraftContent {
  return {
    title: state.title.trim(),
    instructions: state.instructions.trim(),
    items: state.items.map((i, position) => ({
      exerciseId: i.exerciseId,
      position,
      dose: {
        sets: num(i.sets),
        reps: num(i.reps),
        holdSeconds: num(i.holdSeconds),
        durationSeconds: num(i.durationSeconds),
        restSeconds: num(i.restSeconds) ?? 0,
      },
      schedule: {
        daysOfWeek: [...i.days].sort((a, b) => a - b),
        timesPerDay: num(i.timesPerDay) ?? 1,
      },
      instructions: i.instructions.trim() === "" ? null : i.instructions.trim(),
    })),
    goals: state.goals.map((g) => ({
      id: g.id,
      description: g.description.trim(),
      targetValue: num(g.targetValue),
      targetUnit: g.targetUnit.trim() === "" ? null : g.targetUnit.trim(),
      dueDate: g.dueDate === "" ? null : g.dueDate,
    })),
  };
}

export interface Problems {
  title?: string;
  /** Message per item index. */
  items: Record<number, string>;
  goals: Record<number, string>;
  other: string[];
}

/** Friendly wording for the shared contract's issues. */
function friendly(path: (string | number)[], message: string): string {
  const last = String(path.at(-1) ?? "");
  if (message.startsWith("Invalid input: expected number")) return "Enter a whole number.";
  if (last === "daysOfWeek" && message.includes("Too small")) return "Pick at least one day.";
  if (last === "description") return "Describe the goal.";
  if (last === "title") return "Give the plan a title.";
  return message;
}

export function validate(
  state: DraftState,
): { ok: true; content: CarePlanDraftContent } | { ok: false; problems: Problems } {
  const content = toContent(state);
  const result = carePlanDraftContentSchema.safeParse(content);
  if (result.success) return { ok: true, content: result.data };
  const problems: Problems = { items: {}, goals: {}, other: [] };
  for (const issue of result.error.issues) {
    const path = issue.path.filter((p): p is string | number => typeof p !== "symbol");
    const message = friendly(path, issue.message);
    if (path[0] === "title") problems.title = message;
    else if (path[0] === "items" && typeof path[1] === "number") {
      problems.items[path[1]] ??= message;
    } else if (path[0] === "goals" && typeof path[1] === "number") {
      problems.goals[path[1]] ??= message;
    } else problems.other.push(message);
  }
  return { ok: false, problems };
}

export function move<T>(list: T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(target, 0, item as T);
  return copy;
}
