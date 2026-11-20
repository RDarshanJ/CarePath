# CD-413: Audit and record history display

| Field | Entry |
|---|---|
| ID | CD-413 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/07-clinical-documentation.md` section 7.4 |
| Date | 2026-11-20 |
| Screen or workflow | Record History tab; admin audit viewer |
| User segment | Therapist; administrator |
| User task | Answer who did what to this record, when and why |
| Business objective | REQ-AUD-04, REQ-REC-02 |

## Alternatives considered
- A. Chronological table
- B. Vertical timeline cards
- C. Last-edited line only
- D. Field-level attribution

## References
- DAX version timeline (via M)
- Usage matrix A3 table header inconsistency

## Research evidence
C fails as an audit view. Weighted: A 4.20, B 3.45, D 3.05; C 3.35 gate fail. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Table semantics with `Th`; no title-only truncation; stacked rows below 768 px; absolute time with zone.

## Clinical and privacy constraints
Rows immutable; patient names not in page title; coordinator refused audit (AC-H5).

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C, D

## Decision rationale
Scannable, filterable, accessible, reuses table pattern.

## Validation method
AC-I5; axe table semantics; zone label present.
