# CD-440: Feedback channels, priority and persistence

| Field | Entry |
|---|---|
| ID | CD-440 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/10-feedback-error-recovery.md` section 2 |
| Date | 2026-11-20 |
| Screen or workflow | All screens |
| User segment | All |
| User task | Know what happened and what to do |
| Business objective | No toast-only clinical errors; avoid fatigue |

## Alternatives considered
- A. Tiered channels
- B. Toast-first
- C. Banners only
- D. Notification centre primary

## References
- Carbon notification pattern (https://carbondesignsystem.com/patterns/notification-pattern/, read 2026-11-20)
- GOV.UK notification banner
- WCAG 4.1.3

## Research evidence
Carbon: only toasts without actions dismiss themselves; GOV.UK: one banner per page. Weighted: A 4.15, B 2.40 (gate fail), C 3.00, D 2.65. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Roles by level; no auto-dismiss for critical.

## Clinical and privacy constraints
Critical content persistent.

## Interaction complexity
Medium.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C, D

## Decision rationale
Channel follows severity and need for record.

## Validation method
Per-row tests of the rule table.
