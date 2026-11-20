import { z } from "zod";

/**
 * Evaluation case format for `pnpm ai:eval` (WP 5.1 defines it, WP 5.5 writes the cases).
 *
 * One synthetic encounter per file: `packages/ai/evals/data/case-NN.json` (NN = 01 to 25).
 * Every case is synthetic. Names, phone numbers and dates inside a transcript are invented.
 * See `packages/ai/evals/README.md` for the rules and a worked example.
 */

export const EVAL_CASE_SCHEMA_VERSION = 1 as const;

export const TranscriptSpeaker = z.enum(["clinician", "patient", "caregiver"]);
export type TranscriptSpeaker = z.infer<typeof TranscriptSpeaker>;

export const SoapSection = z.enum(["subjective", "objective", "assessment", "plan"]);
export type SoapSection = z.infer<typeof SoapSection>;

/**
 * Fixed vocabulary for missing-information indicators. A SOAP draft reports an item as missing when
 * the transcript does not cover it. `expectedMissing` lists the items this transcript does not cover.
 */
export const MissingInfoItem = z.enum([
  "pain_score",
  "range_of_motion",
  "strength",
  "functional_status",
  "home_exercise_adherence",
  "red_flag_screen",
  "goals",
  "follow_up_plan",
]);
export type MissingInfoItem = z.infer<typeof MissingInfoItem>;

export const EncounterType = z.enum(["initial_evaluation", "follow_up", "video_follow_up"]);

// Any 8-4-4-4-12 hex id. The database issues v4 UUIDs; fixtures may use readable synthetic ones.
const uuid = z.guid();

export const TranscriptTurn = z.object({
  /** 1-based, consecutive. Source references cite turns as field `transcript.turn.<turn>`. */
  turn: z.int().min(1),
  speaker: TranscriptSpeaker,
  text: z.string().trim().min(1).max(1000),
});
export type TranscriptTurn = z.infer<typeof TranscriptTurn>;

export const ExpectedFact = z.object({
  /** `f1`, `f2`, ... unique within the case. */
  id: z.string().regex(/^f\d+$/),
  /** The SOAP section a correct draft puts this fact in. */
  section: SoapSection,
  /** The fact in plain words, for the human reviewer. Not used for matching. */
  statement: z.string().trim().min(1).max(300),
  /**
   * Terms that must all appear (case-insensitive substring) in one generated statement of
   * `section` for the fact to count as recalled. Keep them short and literal: `"4/10"`, `"knee"`,
   * `"stairs"`. Every term must occur in the text of at least one of `sourceTurns`.
   */
  mustMention: z.array(z.string().trim().min(1).max(60)).min(1).max(5),
  /** Turns that state the fact. A recalled fact whose statement cites one of these counts as correctly cited. */
  sourceTurns: z.array(z.int().min(1)).min(1),
});
export type ExpectedFact = z.infer<typeof ExpectedFact>;

export const InjectionProbe = z.object({
  /** The turn whose text contains an instruction-like string aimed at the model. */
  turn: z.int().min(1),
  /** Strings that must not appear (case-insensitive) anywhere in the generated output if the instruction was ignored. */
  forbiddenOutputs: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
});
export type InjectionProbe = z.infer<typeof InjectionProbe>;

export const EvalCase = z
  .object({
    schemaVersion: z.literal(EVAL_CASE_SCHEMA_VERSION),
    /** `case-NN`, equal to the file name without `.json`. */
    id: z.string().regex(/^case-\d{2}$/),
    title: z.string().trim().min(1).max(120),
    synthetic: z.literal(true),
    encounter: z.object({
      id: uuid,
      patientId: uuid,
      organizationId: uuid,
      type: EncounterType,
      /** Free text, for example "left knee" or "lower back". */
      bodyRegion: z.string().trim().min(1).max(60),
    }),
    transcript: z.array(TranscriptTurn).min(4).max(80),
    expectedFacts: z.array(ExpectedFact).min(3).max(20),
    /** Items from the fixed vocabulary that this transcript does not cover. May be empty. */
    expectedMissing: z.array(MissingInfoItem),
    /** Present only on prompt-injection cases; null otherwise. */
    injection: InjectionProbe.nullable(),
    /** Optional reviewer note. */
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((c, ctx) => {
    c.transcript.forEach((t, i) => {
      if (t.turn !== i + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["transcript", i, "turn"],
          message: `turns must be consecutive from 1; expected ${i + 1}`,
        });
      }
    });
    const turnText = new Map(c.transcript.map((t) => [t.turn, t.text.toLowerCase()]));
    const factIds = new Set<string>();
    c.expectedFacts.forEach((f, i) => {
      if (factIds.has(f.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["expectedFacts", i, "id"],
          message: `duplicate fact id ${f.id}`,
        });
      }
      factIds.add(f.id);
      for (const turn of f.sourceTurns) {
        if (!turnText.has(turn)) {
          ctx.addIssue({
            code: "custom",
            path: ["expectedFacts", i, "sourceTurns"],
            message: `turn ${turn} does not exist`,
          });
        }
      }
      for (const term of f.mustMention) {
        const t = term.toLowerCase();
        if (!f.sourceTurns.some((n) => turnText.get(n)?.includes(t))) {
          ctx.addIssue({
            code: "custom",
            path: ["expectedFacts", i, "mustMention"],
            message: `term "${term}" does not occur in any of its sourceTurns`,
          });
        }
      }
    });
    if (new Set(c.expectedMissing).size !== c.expectedMissing.length) {
      ctx.addIssue({
        code: "custom",
        path: ["expectedMissing"],
        message: "duplicate missing item",
      });
    }
    if (c.injection && !turnText.has(c.injection.turn)) {
      ctx.addIssue({
        code: "custom",
        path: ["injection", "turn"],
        message: `turn ${c.injection.turn} does not exist`,
      });
    }
  });
export type EvalCase = z.infer<typeof EvalCase>;

/** Validates one parsed JSON value; the file name (without `.json`) must equal `id`. */
export function parseEvalCase(value: unknown, fileStem?: string): EvalCase {
  const parsed = EvalCase.parse(value);
  if (fileStem !== undefined && parsed.id !== fileStem) {
    throw new Error(`case id ${parsed.id} does not match file name ${fileStem}.json`);
  }
  return parsed;
}
