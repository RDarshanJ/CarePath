# CD-412: Amendments as new versions

| Field | Entry |
|---|---|
| ID | CD-412 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/07-clinical-documentation.md` section 7.3 |
| Date | 2026-11-20 |
| Screen or workflow | Signed note |
| User segment | Caseload therapist (T1) |
| User task | Correct or add to a signed note without losing it |
| Business objective | REQ-NOT-02 |

## Alternatives considered
- A. Amendment as new version with required reason
- B. Tracked changes in place
- C. Overwrite with audit
- D. Entered in error and rewrite

## References
- eCFR 45 CFR 164.526(c)(1) (append or link; analogy only; https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.526, read 2026-11-20)
- FHIR Composition and HHS amendment page not retrieved

## Research evidence
B and C fail immutability. Weighted: A 4.05, D 2.75; B 3.20 and C 3.45 gate fail. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Reason field first; changed sections marked in words; version list as readable list.

## Clinical and privacy constraints
Original preserved; contract gap: whether an amendment needs its own signature (flagged).

## Interaction complexity
Medium.

## Technical feasibility
Feasible; contract question open.

## Selected
A

## Rejected
B, C (gate fail); D (kept only as separate entered-in-error action)

## Decision rationale
Matches append-only versions and gives continuity for small corrections.

## Validation method
UPDATE rejected test; amendment links prior; version list reading order.
