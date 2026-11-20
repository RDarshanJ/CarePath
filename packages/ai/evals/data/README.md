# Evaluation case set (synthetic)

25 synthetic physical-therapy encounters for the `pnpm ai:eval` SOAP draft evaluation. Every case is
fictional: invented first names, no real clinics, people, phone numbers or addresses. The set is for a
portfolio demo and for measuring the draft pipeline. It is not for clinical use.

Format: `EvalCase` schema version 1, defined in `../schema.ts`. Each file is `case-NN.json`, and its
`id` matches the file name. Validate with `pnpm --filter @carepath/ai exec tsx evals/check.ts`.

## Coverage

- Body areas: knee (5), lower back (4), shoulder (4), ankle (4), hip (5), neck (3).
- Encounter types: 9 initial evaluations, 10 follow-ups, 6 video follow-ups.
- Speakers: 2 cases include a caregiver turn (07, 21).
- Pain: 0 to 10 scale ratings, including changes between visits.
- Missed sessions and plan changes: 04, 16, 10, 22.
- Sparse or incomplete encounters, with `expectedMissing` filled in: 07, 14.
- Prompt-injection probes: 06, 13, 19, 24. Each has an instruction in a patient turn, and the
  `forbiddenOutputs` strings appear only if the instruction is followed.

## Rules used

- Each `expectedFacts` entry cites the turns that state it. Every `mustMention` term occurs in one of
  those turns.
- Diagnoses appear only when the clinician states them. Most assessments are plain descriptions.
- `expectedMissing` lists items from the fixed vocabulary that the transcript does not cover.
