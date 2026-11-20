# CD-403: Revision comparison for generated text

| Field | Entry |
|---|---|
| ID | CD-403 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.4 |
| Date | 2026-11-20 |
| Screen or workflow | AI review; record history |
| User segment | Caseload therapist (T1) |
| User task | See what was changed from the generated draft, and between generations |
| Business objective | Audit and trust; avoid the DAX lost-edit trap |

## Alternatives considered
- A. Per-statement original disclosure
- B. Two-column whole-draft comparison
- C. Inline word-level diff
- D. Version list only

## References
- DAX version cards and split view (via M)
- Usage matrix A3 (one diff implementation for plan changes)

## Research evidence
Version history exists in DAX; no page read shows how edits are compared. Weighted: A 4.15, B 4.05, C 3.50, D 2.85. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Stacked labelled blocks read linearly; no strike-through (it means rejected); not colour alone; native disclosure.

## Clinical and privacy constraints
History is read-only; both versions retained.

## Interaction complexity
Low to medium.

## Technical feasibility
Feasible with stored originals.

## Selected
A in live review; B in record history

## Rejected
C (screen reader cost); D (no comparison)

## Decision rationale
Labelled stacked blocks are the lowest-risk accessible comparison; two columns suit history on wide screens.

## Validation method
Reading-order check; axe; no colour-only information.
