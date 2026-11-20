import { z } from "zod";
import { bodyAreaSchema, pageOf } from "./common.js";

export const exerciseCategories = [
  "mobility",
  "strengthening",
  "stretching",
  "balance",
  "endurance",
] as const;
export const exerciseCategorySchema = z.enum(exerciseCategories);

/** Library content. All exercises are fictional and not medically reviewed. */
export const exerciseSchema = z
  .object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    bodyArea: z.string(),
    category: z.string(),
    description: z.string(),
    instructions: z.string(),
    mediaPath: z.string().nullable(),
    defaults: z.object({
      sets: z.number().int().nullable(),
      reps: z.number().int().nullable(),
      holdSeconds: z.number().int().nullable(),
      durationSeconds: z.number().int().nullable(),
    }),
  })
  .meta({ id: "Exercise" });
export type Exercise = z.infer<typeof exerciseSchema>;

export const exerciseLibraryQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    bodyArea: bodyAreaSchema.optional(),
    category: exerciseCategorySchema.optional(),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  });
export type ExerciseLibraryQuery = z.input<typeof exerciseLibraryQuerySchema>;

/** Sorted by name. Inactive exercises are not listed. */
export const exerciseLibraryPageSchema = pageOf(exerciseSchema).meta({ id: "ExerciseLibraryPage" });
export type ExerciseLibraryPage = z.infer<typeof exerciseLibraryPageSchema>;
