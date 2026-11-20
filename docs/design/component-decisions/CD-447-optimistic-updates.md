# CD-447: Optimistic updates allowlist

| Field | Entry |
|---|---|
| ID | CD-447 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/10-feedback-error-recovery.md` section 9 |
| Date | 2026-11-20 |
| Screen or workflow | Builder, messages |
| User segment | All |
| User task | Fast feedback where safe |
| Business objective | Trust |

## Alternatives considered
- A. Allowlist
- B. Everywhere
- C. None

## References
- Brief section 14

## Research evidence
Weighted: A 4.05, C 3.30, B 2.95 (gate fail). Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Pending marker in words.

## Clinical and privacy constraints
No optimistic clinical, booking or consent writes.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C

## Decision rationale
Optimism only where failure is recoverable.

## Validation method
Failure revert tests.
