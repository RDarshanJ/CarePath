import { z } from "zod";

/**
 * Building blocks shared by the domain contracts. Instants are ISO 8601 UTC strings; calendar
 * days are `YYYY-MM-DD` in the organization's time zone, which every response that carries one
 * also names (route table rule 9).
 */

export const instantSchema = z.iso.datetime();
export const localDateSchema = z.iso.date();

/** `?cursor=<opaque>&limit=<1..100>` (route table rule 10). The cursor is opaque to clients. */
export const cursorQuerySchema = z
  .object({
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .meta({ id: "CursorQuery" });

export type CursorQuery = z.input<typeof cursorQuerySchema>;

/** `{ items, nextCursor }`; nextCursor is null on the last page. */
export function pageOf<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
}

/** A person shown by name: practitioner, staff member or reviewer. */
export const personRefSchema = z.object({
  userId: z.uuid().nullable(),
  practitionerId: z.uuid().nullable(),
  name: z.string(),
});
export type PersonRef = z.infer<typeof personRefSchema>;

/** Empty JSON object body for action endpoints (`.strict()`: unknown keys are a 400). */
export const emptyBodySchema = z.object({}).strict();

/** Weekday numbers used by plan schedules: 0 is Sunday, 6 is Saturday. */
export const weekdaySchema = z.number().int().min(0).max(6);

export const bodyAreas = [
  "lower back",
  "upper back",
  "neck",
  "shoulder",
  "knee",
  "hip",
  "ankle and foot",
  "core",
  "balance",
  "general",
] as const;
export const bodyAreaSchema = z.enum(bodyAreas);
export type BodyArea = z.infer<typeof bodyAreaSchema>;
