# CD-415: Clinical note status vocabulary

| Field | Entry |
|---|---|
| ID | CD-415 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/07-clinical-documentation.md` section 7.6 |
| Date | 2026-11-20 |
| Screen or workflow | Note header, lists, history |
| User segment | Therapist |
| User task | Know a note state in words |
| Business objective | Brief section 13 vocabulary; one shared map |

## Alternatives considered
- Conventional rule applied: clinical status uses StatusChip

## References
- Usage matrix C and `components.md` chip versus tag rule
- Domain model state table

## Research evidence
Established design-system rule; no alternatives invented. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Words and icon, never colour alone; chip prefixed by object in context.

## Clinical and privacy constraints
Entered in error requires a reason; export excludes it; who may set it is open.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
Draft, Signed, Signed amended (derived), Entered in error

## Rejected
Final, Active

## Decision rationale
Maps to actual state; distinct from plan and AI vocabularies.

## Validation method
Single status map module.
