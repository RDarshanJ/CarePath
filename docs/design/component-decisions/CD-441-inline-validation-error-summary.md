# CD-441: Inline validation and error summary

| Field | Entry |
|---|---|
| ID | CD-441 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/10-feedback-error-recovery.md` section 3 |
| Date | 2026-11-20 |
| Screen or workflow | Forms |
| User segment | Patient; therapist |
| User task | Fix entries without losing input |
| Business objective | Accessible error recovery |

## Alternatives considered
- A. Blur and submit with summary
- B. Keystroke
- C. Submit only
- D. Inline only

## References
- GOV.UK error summary (https://design-system.service.gov.uk/components/error-summary/, read 2026-11-20)
- NN/g form errors (https://www.nngroup.com/articles/errors-forms-design-guidelines/, read 2026-11-20)

## Research evidence
GOV.UK requires summary; NN/g timing. Weighted: A 4.45, B 2.60, C 3.70, D 3.20. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Focus to summary; links to fields; title prefix.

## Clinical and privacy constraints
Clinical ranges stated.

## Interaction complexity
Medium.

## Technical feasibility
Feasible: onboarding summary exists.

## Selected
A

## Rejected
B, C, D

## Decision rationale
Matches both references.

## Validation method
axe; focus tests.
