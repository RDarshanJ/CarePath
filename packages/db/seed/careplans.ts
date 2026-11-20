/** Exercise library, care plans with immutable versions, assignments and goals. */
import {
  D,
  H,
  iso,
  isoDate,
  type AssignmentItem,
  type Ctx,
  type PatientInfo,
  type VersionInfo,
} from "./ctx.js";
import { EXERCISE_DISCLAIMER, exerciseLibrary, type ExerciseDef } from "./data/exercises.js";
import { exerciseMedia } from "./data/exercise-media.js";
import { changeReasons, planInstructions } from "./data/text.js";
import type { Rng } from "./rng.js";

const defsBySlug = new Map(exerciseLibrary.map((d) => [d.slug, d]));
const dayPatterns: readonly number[][] = [
  [1, 3, 5],
  [1, 2, 4, 5],
  [2, 4, 6],
  [1, 4],
  [1, 2, 3, 4, 5],
];
const extraNotes = [
  "Move slowly.",
  "Use a lighter resistance this week.",
  "Stay within a comfortable range.",
];

export function buildExercises(ctx: Ctx): void {
  for (const org of ctx.orgs) {
    exerciseLibrary.forEach((def, i) => {
      const id = ctx.id("exercise", `${org.index + 1}/${def.slug}`);
      org.exerciseIds.set(def.slug, id);
      const at = iso(ctx.anchorMs - (ctx.profile.historyDays + 55) * D + i * 1000);
      ctx.t.Exercise.push({
        id,
        organizationId: org.id,
        slug: def.slug,
        name: def.name,
        bodyArea: def.bodyArea,
        category: def.category,
        description: `${def.description} ${EXERCISE_DISCLAIMER}`,
        instructions: def.instructions,
        // Own picture or the body-area picture, set together (checkpoint C2, ruling 3.4).
        ...exerciseMedia(def.slug, def.bodyArea),
        defaultSets: def.sets,
        defaultReps: def.reps ?? null,
        defaultHoldSeconds: def.holdSeconds ?? null,
        defaultDurationSeconds: def.durationSeconds ?? null,
        active: true,
        createdAt: at,
        updatedAt: at,
      });
    });
  }
}

function itemFor(ctx: Ctx, versionId: string, position: number, def: ExerciseDef): AssignmentItem {
  return {
    id: ctx.id("assignment", `${versionId}/${position}`),
    position,
    slug: def.slug,
    name: def.name,
    sets: def.sets,
    reps: def.reps ?? null,
    holdSeconds: def.holdSeconds ?? null,
    durationSeconds: def.durationSeconds ?? null,
    restSeconds: def.category === "strengthening" ? 45 : 30,
  };
}

function initialSlugs(p: PatientInfo, rng: Rng): string[] {
  const primary = exerciseLibrary.filter((d) => d.bodyArea === p.regimen.area).map((d) => d.slug);
  const others = exerciseLibrary
    .filter((d) => d.bodyArea !== p.regimen.area && p.regimen.pool.includes(d.bodyArea))
    .map((d) => d.slug);
  return [
    ...rng.sample(primary, Math.min(primary.length, rng.int(2, 3))),
    ...rng.sample(others, rng.int(1, 2)),
  ];
}

/** Next version: maybe swap one exercise, then adjust the dose of one or two, always at least one change. */
function revise(
  ctx: Ctx,
  p: PatientInfo,
  prev: VersionInfo,
  rng: Rng,
  versionId: string,
): { items: AssignmentItem[]; note: string } {
  let items = prev.items.map((i) => ({ ...i }));
  const added: string[] = [];
  const removed: string[] = [];
  const dosed: string[] = [];
  if (rng.chance(0.6)) {
    const pool = exerciseLibrary.filter(
      (d) => p.regimen.pool.includes(d.bodyArea) && !items.some((i) => i.slug === d.slug),
    );
    if (pool.length > 0) {
      if (items.length > 3) {
        const dropAt = rng.int(0, items.length - 1);
        removed.push((items[dropAt] as AssignmentItem).name);
        items = items.filter((_, idx) => idx !== dropAt);
      }
      const def = rng.pick(pool);
      added.push(def.name);
      items.push(itemFor(ctx, versionId, items.length, def));
    }
  }
  const adjust = rng.int(1, 2);
  for (const target of rng.sample(
    items.filter((i) => !added.includes(i.name)),
    adjust,
  )) {
    if (target.reps !== null) target.reps += 2;
    else if (target.holdSeconds !== null) target.holdSeconds += 5;
    else if (target.durationSeconds !== null) target.durationSeconds += 15;
    else continue;
    dosed.push(target.name);
  }
  if (added.length === 0 && dosed.length === 0) {
    const def = rng.pick(
      exerciseLibrary.filter(
        (d) => p.regimen.pool.includes(d.bodyArea) && !items.some((i) => i.slug === d.slug),
      ),
    );
    added.push(def.name);
    items.push(itemFor(ctx, versionId, items.length, def));
  }
  items = items.map((i, idx) => ({
    ...i,
    position: idx,
    id: ctx.id("assignment", `${versionId}/${idx}`),
  }));
  const parts: string[] = [];
  if (added.length) parts.push(`Added: ${added.join(", ")}.`);
  if (removed.length) parts.push(`Removed: ${removed.join(", ")}.`);
  if (dosed.length) parts.push(`More to do on: ${dosed.join(", ")}.`);
  parts.push(rng.pick(changeReasons));
  return { items, note: parts.join(" ") };
}

export function buildCarePlans(ctx: Ctx): void {
  const { t } = ctx;
  const activateRows: Record<string, unknown>[] = [];
  const secondStepRows: Record<string, unknown>[] = [];

  for (const p of ctx.patients) {
    if (!p.therapist) continue;
    const rng = ctx.rng.fork(`careplan/${p.id}`);
    const therapist = p.therapist;
    const end = p.status === "active" ? ctx.anchorMs : p.activeEndMs;
    const planStart = Math.min(p.planStartMs, end - 3 * D);
    p.planStartMs = planStart;
    const planId = ctx.id("careplan", p.id);
    p.planId = planId;
    const target =
      p.persona === "demo"
        ? 3
        : p.persona
          ? 2
          : rng.weighted([
              [1, 35],
              [2, 35],
              [3, 20],
              [4, 10],
            ] as const);
    const times = [planStart];
    while (times.length < target) {
      const next =
        (times[times.length - 1] as number) +
        (p.persona === "demo" ? rng.int(15, 18) : rng.int(9, 16)) * D;
      if (next > end - 2 * D) break;
      times.push(next);
    }
    const baseDays = p.persona === "demo" ? [1, 2, 4, 5] : rng.pick(dayPatterns);
    const title = p.regimen.planTitle;
    const instructions = rng.pick(planInstructions);

    t.CarePlan.push({
      id: planId,
      organizationId: p.org.id,
      patientId: p.id,
      title,
      status: "draft",
      currentVersionId: null,
      draftContent: null,
      draftUpdatedAt: null,
      createdByPractitionerId: therapist.practitionerId,
      createdAt: iso(planStart - 3 * H),
      updatedAt: iso(planStart - 3 * H),
    });

    let prev: VersionInfo | null = null;
    times.forEach((publishedAtMs, vi) => {
      const number = vi + 1;
      const versionId = ctx.id("careplan-version", `${planId}/${number}`);
      let items: AssignmentItem[];
      let note: string | null = null;
      if (!prev) {
        items = initialSlugs(p, rng).map((slug, pos) =>
          itemFor(ctx, versionId, pos, defsBySlug.get(slug) as ExerciseDef),
        );
      } else {
        const r = revise(ctx, p, prev, rng, versionId);
        items = r.items;
        note = r.note;
      }
      // Items of a copied version need ids of the new version.
      items = items.map((i, pos) => ({
        ...i,
        position: pos,
        id: ctx.id("assignment", `${versionId}/${pos}`),
      }));
      const days = vi === 0 || rng.chance(0.8) ? baseDays : (rng.pick(dayPatterns) as number[]);
      const version: VersionInfo = {
        id: versionId,
        number,
        publishedAtMs,
        days: p.persona === "demo" ? baseDays : days,
        items,
      };
      p.versions.push(version);
      prev = version;
      t.CarePlanVersion.push({
        id: versionId,
        organizationId: p.org.id,
        carePlanId: planId,
        versionNumber: number,
        title,
        instructions,
        changeNoteForPatient: note,
        publishedByPractitionerId: therapist.practitionerId,
        publishedAt: iso(publishedAtMs),
      });
      for (const item of items) {
        t.ExerciseAssignment.push({
          id: item.id,
          organizationId: p.org.id,
          carePlanVersionId: versionId,
          exerciseId: p.org.exerciseIds.get(item.slug) as string,
          position: item.position,
          sets: item.sets,
          reps: item.reps,
          holdSeconds: item.holdSeconds,
          durationSeconds: item.durationSeconds,
          restSeconds: item.restSeconds,
          daysOfWeek: version.days,
          timesPerDay: 1,
          instructions: rng.chance(0.15) ? rng.pick(extraNotes) : null,
          createdAt: iso(publishedAtMs),
        });
      }
    });

    const last = p.versions[p.versions.length - 1] as VersionInfo;
    const lastAt = last.publishedAtMs;
    const finalStatus =
      p.status === "inactive" ? "on_hold" : p.status === "discharged" ? "completed" : "active";
    activateRows.push({
      id: planId,
      status: "active",
      currentVersionId: last.id,
      updatedAt: iso(lastAt),
    });
    if (finalStatus !== "active")
      secondStepRows.push({
        id: planId,
        status: finalStatus,
        updatedAt: iso(Math.max(p.activeEndMs, lastAt)),
      });

    // Goals.
    p.regimen.goals.slice(0, p.persona === "demo" ? 2 : rng.int(1, 2)).forEach((g, gi) => {
      const lifecycleStatus =
        p.status === "discharged" ? "completed" : p.status === "inactive" ? "on_hold" : "active";
      t.Goal.push({
        id: ctx.id("goal", `${planId}/${gi}`),
        organizationId: p.org.id,
        patientId: p.id,
        carePlanId: planId,
        addressesConditionId: p.conditionId,
        description: g.description,
        lifecycleStatus,
        achievementStatus: lifecycleStatus === "completed" ? "achieved" : "in-progress",
        measureSystem: "urn:carepath:goal-measure",
        measureCode: g.unit,
        targetValue: g.target,
        targetUnit: g.unit,
        startDate: isoDate(planStart),
        dueDate: isoDate(planStart + 56 * D),
        createdAt: iso(planStart),
        updatedAt: iso(
          lifecycleStatus === "active" ? planStart : Math.max(p.activeEndMs, planStart),
        ),
      });
    });
  }
  ctx.post.push({ kind: "update", table: "CarePlan", rows: activateRows });
  if (secondStepRows.length)
    ctx.post.push({ kind: "update", table: "CarePlan", rows: secondStepRows });
}
