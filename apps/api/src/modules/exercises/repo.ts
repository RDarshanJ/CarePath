import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

export interface ExerciseFilter {
  q?: string;
  bodyArea?: string;
  category?: string;
}

/** Active library exercises of the organization, by name. */
export async function listExercises(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  filter: ExerciseFilter,
  offset: number,
  take: number,
) {
  return db.exercise.findMany({
    where: {
      organizationId: ctx.orgId,
      active: true,
      ...(filter.q ? { name: { contains: filter.q, mode: "insensitive" as const } } : {}),
      ...(filter.bodyArea ? { bodyArea: filter.bodyArea } : {}),
      ...(filter.category ? { category: filter.category } : {}),
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: offset,
    take,
    select: {
      id: true,
      slug: true,
      name: true,
      bodyArea: true,
      category: true,
      description: true,
      instructions: true,
      mediaPath: true,
      mediaAlt: true,
      defaultSets: true,
      defaultReps: true,
      defaultHoldSeconds: true,
      defaultDurationSeconds: true,
    },
  });
}

/** Ids among `ids` that are active exercises of the organization. */
export async function existingExerciseIds(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  ids: string[],
): Promise<Set<string>> {
  const rows = await db.exercise.findMany({
    where: { organizationId: ctx.orgId, active: true, id: { in: ids } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export async function exercisesByIds(db: DbClient, ctx: Pick<RequestCtx, "orgId">, ids: string[]) {
  return db.exercise.findMany({
    where: { organizationId: ctx.orgId, id: { in: ids } },
    select: {
      id: true,
      name: true,
      bodyArea: true,
      category: true,
      description: true,
      instructions: true,
      mediaPath: true,
      mediaAlt: true,
    },
  });
}
