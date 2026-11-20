# CD-422: Which actions need confirmation

| Field | Entry |
|---|---|
| ID | CD-422 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.3 |
| Date | 2026-11-20 |
| Screen or workflow | All actions |
| User segment | All |
| User task | Protect against serious mistakes without click-through |
| Business objective | Fewer confirmations that matter more |

## Alternatives considered
- A. Confirm everything
- B. Tiered policy
- C. Undo only
- D. Typed confirmation

## References
- NN/g confirmation dialogs (https://www.nngroup.com/articles/confirmation-dialog/, read 2026-11-20)
- Mobbin delete dialogs and typed confirmations (URLs in 08-actions.md)
- APG alertdialog

## Research evidence
Typed confirmation appears for deleting whole projects or workspaces. Weighted: B 3.95, A 2.50, C 3.35 (gate fail for server-irreversible), D 2.55. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Specific verbs; initial focus on the safe action; dialogs one form long.

## Clinical and privacy constraints
Per-action table in 08-actions.md.

## Interaction complexity
Medium.

## Technical feasibility
Feasible.

## Selected
B

## Rejected
A, C as whole policy, D

## Decision rationale
Friction proportional to consequence.

## Validation method
Per-action review; focus tests.
