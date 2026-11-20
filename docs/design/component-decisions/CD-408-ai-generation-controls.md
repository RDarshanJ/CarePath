# CD-408: Generation controls and failure states

| Field | Entry |
|---|---|
| ID | CD-408 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.9 |
| Date | 2026-11-20 |
| Screen or workflow | AI summaries section |
| User segment | Caseload therapist (T1) |
| User task | Ask for a draft deliberately, wait honestly, recover from failure |
| Business objective | Consent and safety; AC-F2, F5, F7 |

## Alternatives considered
- A. Explicit "Draft progress review" button
- B. Auto-generate on open
- C. Scheduled pre-generation
- D. Floating assistant

## References
- `docs/design/feature-research/M-ai-summaries.md` section 6 (Abridge, DAX Copilot for Epic, SPRY, Ambience, NYU Langone, Heidi; retrieved 2026-11-20)
- NN/g skeleton screens (https://www.nngroup.com/articles/skeleton-screens/, read 2026-11-20)

## Research evidence
B, C fail privacy and safety (generation without a clinician request); D out of scope (AC-F9). A only eligible. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Indeterminate progress with elapsed seconds as text; failures persistent in context; no fake percentage.

## Clinical and privacy constraints
Consent checked at request time; refusal audited; no partial draft stored on invalid output.

## Interaction complexity
Medium.

## Technical feasibility
Needs AI endpoints.

## Selected
A explicit button; "Make a new draft" for regenerate; no sparkle

## Rejected
B, C, D

## Decision rationale
Deliberate request keeps consent and audit clear.

## Validation method
AC-F2, F5, F7 tests; timeout copy review.
