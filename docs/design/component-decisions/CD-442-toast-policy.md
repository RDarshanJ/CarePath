# CD-442: Toast policy and removal of toast-only clinical errors

| Field | Entry |
|---|---|
| ID | CD-442 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/10-feedback-error-recovery.md` section 4 |
| Date | 2026-11-20 |
| Screen or workflow | Clinician mutations |
| User segment | Therapist |
| User task | Know an action result without losing errors |
| Business objective | Brief section 14 |

## Alternatives considered
- A. Restricted toast
- B. Status quo
- C. No toasts
- D. Undo snackbar

## References
- Carbon notification pattern (https://carbondesignsystem.com/patterns/notification-pattern/, read 2026-11-20)
- WCAG 2.2.2
- Mobbin Contra, Base44

## Research evidence
Weighted: A 3.85, C 3.75, D 3.10, B 2.30 (gate fail). Close between A and C. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Pause on hover and focus; queue while modal open.

## Clinical and privacy constraints
Errors never toasts.

## Interaction complexity
Medium.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, D

## Decision rationale
Keeps a light channel for success without risking errors.

## Validation method
No error tone type; dialog-open hold test.
