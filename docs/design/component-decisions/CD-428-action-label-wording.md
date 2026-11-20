# CD-428: Action label wording

| Field | Entry |
|---|---|
| ID | CD-428 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.9 |
| Date | 2026-11-20 |
| Screen or workflow | All screens |
| User segment | All |
| User task | Understand what an action does before using it |
| Business objective | Clarity, brief section 8 |

## Alternatives considered
- Conventional wording rules; label table

## References
- NHS Buttons (button text and context make the outcome clear)
- NN/g confirmation dialogs (https://www.nngroup.com/articles/confirmation-dialog/, read 2026-11-20)

## Research evidence
Code shows duplicates and generics (see table in 08-actions.md). Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Accessible names contain visible label text.

## Clinical and privacy constraints
None.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
Label table replacing every generic or duplicated label

## Rejected
Submit, OK, Confirm, Yes, Cancel, Continue, Got it, Try again alone

## Decision rationale
Verbs and objects reduce errors.

## Validation method
Label lint; accessible-name tests.
