# CD-449: Error content template, errors in dialogs, retry

| Field | Entry |
|---|---|
| ID | CD-449 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/10-feedback-error-recovery.md` section 11 |
| Date | 2026-11-20 |
| Screen or workflow | All |
| User segment | All |
| User task | Recover from errors in place |
| Business objective | Fix errors behind modals |

## Alternatives considered
- A. Inside dialog
- B. Toast over modal
- C. Close and banner

## References
- GOV.UK error summary (https://design-system.service.gov.uk/components/error-summary/, read 2026-11-20)
- APG alertdialog
- Mobbin Contra

## Research evidence
Weighted: A 4.70, C 2.85, B 1.80 (gate fail). Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Banner inside dialog with focus; Esc warns on lost text.

## Clinical and privacy constraints
Input kept.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C

## Decision rationale
Keeps user and input together.

## Validation method
Modal error test.
