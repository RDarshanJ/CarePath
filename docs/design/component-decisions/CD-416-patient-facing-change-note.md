# CD-416: Clinician-written note read by the patient

| Field | Entry |
|---|---|
| ID | CD-416 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/07-clinical-documentation.md` section 7.7 |
| Date | 2026-11-20 |
| Screen or workflow | Publish dialog; plan view; patient Today |
| User segment | Therapist; patient |
| User task | Write a note for the patient and see what they will see |
| Business objective | Reduce misread plan changes (feature O2) |

## Alternatives considered
- Conventional extension of existing flow; no alternatives invented

## References
- Usage matrix G10 and C8

## Research evidence
Code shows the clinician view reuses patient wording ("Set by your care team."). Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Preview region labelled; plain language for patients.

## Clinical and privacy constraints
No generated text offered in this field.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
Preview in dialog; audience-correct labels

## Rejected
Leaving patient wording in clinician view

## Decision rationale
Applies the authorship distinction to an existing flow.

## Validation method
Copy check; screenshot review.
