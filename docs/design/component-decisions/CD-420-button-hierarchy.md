# CD-420: Button hierarchy and variants

| Field | Entry |
|---|---|
| ID | CD-420 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.1 |
| Date | 2026-11-20 |
| Screen or workflow | All screens |
| User segment | All |
| User task | Choose the main action unambiguously |
| Business objective | One primary per context; consistent variants |

## Alternatives considered
- Conventional: reuse existing variants

## References
- NHS Buttons (https://service-manual.nhs.uk/design-system/components/buttons, read 2026-11-20)
- Atlassian Button examples (https://atlassian.design/components/button/examples, read 2026-11-20)

## Research evidence
NHS and Atlassian agree on one primary and danger only at confirmation. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Targets 48 px patient and 24 px minimum clinician; loading keeps label; wrap at 320 px.

## Clinical and privacy constraints
No equal prominence primaries.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
Primary, secondary, tertiary (quiet), link, icon-only, danger as documented

## Rejected
New variants

## Decision rationale
Established pattern is sufficient.

## Validation method
Single-primary tests; browser check of states.
