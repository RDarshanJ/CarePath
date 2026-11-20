# CD-448: Booking confirmation only after the server

| Field | Entry |
|---|---|
| ID | CD-448 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/10-feedback-error-recovery.md` section 10 |
| Date | 2026-11-20 |
| Screen or workflow | Patient booking and reschedule |
| User segment | Patient |
| User task | Book with a truthful result |
| Business objective | Never confirm booking before server |

## Alternatives considered
- A. Pending until server
- B. Optimistic
- C. Reserve then confirm

## References
- Brief section 14
- F research section 13
- WCAG 2.2.1

## Research evidence
B fails gate. A and C tie at 4.35; tie broken by feasibility and timing burden. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Focus to confirmation; alert on conflict.

## Clinical and privacy constraints
Idempotency key requested.

## Interaction complexity
Medium.

## Technical feasibility
Needs idempotency key (contract request).

## Selected
A

## Rejected
B (gate fail); C (needs hold API)

## Decision rationale
Truthful state, safest, feasible.

## Validation method
No early success text test; unknown-outcome test.
