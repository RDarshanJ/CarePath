# CD-409: Failed source never counts as checked

| Field | Entry |
|---|---|
| ID | CD-409 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.10 |
| Date | 2026-11-20 |
| Screen or workflow | Evidence drawer |
| User segment | Caseload therapist (T1) |
| User task | Know when a source could not be read |
| Business objective | Integrity of the evidence-open metric and of review |

## Alternatives considered
- Conventional extension of CD-400 and CD-449; no alternatives invented

## References
- M-ai-summaries.md section 8 B (error and recovery)

## Research evidence
Stated in M as a requirement; no production page read describes it. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Status text, not alert; retry control with a visible name.

## Clinical and privacy constraints
Out-of-scope source treated as unsupported.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
Record the open event only after render; failed source keeps statement unchecked

## Rejected
Counting any click as inspection

## Decision rationale
A click that showed nothing is not inspection.

## Validation method
Unit test: failed fetch does not record an event.
