# CD-414: Autosave and resume for notes

| Field | Entry |
|---|---|
| ID | CD-414 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/07-clinical-documentation.md` section 7.5 |
| Date | 2026-11-20 |
| Screen or workflow | Note editor |
| User segment | Caseload therapist (T1) |
| User task | Never lose a note in progress; know its save state |
| Business objective | REQ-NOT-01 |

## Alternatives considered
- A. Manual save only
- B. Autosave with status line (builder pattern)
- C. Silent autosave

## References
- Internal: builder.tsx save status lines 688 to 706
- WCAG 2.2 SC 4.1.3 (https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html, read 2026-11-20)

## Research evidence
Builder already implements B. Weighted: A 2.65, B 4.35, C 3.35 (hides failures). Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Status line role=status, announced on first save, error and recovery only; beforeunload guard.

## Clinical and privacy constraints
Local PHI recovery not designed (privacy decision open).

## Interaction complexity
Low.

## Technical feasibility
Feasible: pattern exists.

## Selected
B

## Rejected
A, C

## Decision rationale
One save vocabulary across builder and notes.

## Validation method
Draft survives logout; failed autosave keeps text.
