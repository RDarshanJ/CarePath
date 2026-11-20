# CD-407: Checklist-gated review decision bar

| Field | Entry |
|---|---|
| ID | CD-407 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.8 |
| Date | 2026-11-20 |
| Screen or workflow | AI summaries decision |
| User segment | Caseload therapist (T1) |
| User task | Approve, approve with edits or reject a draft |
| Business objective | AC-F4, AC-F8; stronger audit story |

## Alternatives considered
- A. Checklist-gated single decision
- B. Always-enabled Approve
- C. Typed attestation
- D. Second-reviewer approval

## References
- NN/g confirmation dialogs (https://www.nngroup.com/articles/confirmation-dialog/, read 2026-11-20)
- `docs/design/feature-research/M-ai-summaries.md` section 6 (Abridge, DAX Copilot for Epic, SPRY, Ambience, NYU Langone, Heidi; retrieved 2026-11-20)

## Research evidence
Heidi counters and SPRY pre-sign flags shift attention to unresolved items; NN/g warns frequent heavy confirmations train click-through. B fails safety. Weighted: A 3.95, C 2.90, D 2.80. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
aria-disabled with visible reason and jump links; sticky bar with scroll padding; polite status.

## Clinical and privacy constraints
No approval on unseen text; decision, reviewer, time recorded; permission restricted to care-team therapists.

## Interaction complexity
Medium; evidence-open record.

## Technical feasibility
Needs contract request for evidence-open record.

## Selected
A with labels "Approve draft", "Approve draft with edits", "Reject draft"

## Rejected
B (fails gate); C (over-weights routine); D (not in PRD)

## Decision rationale
Makes skimming harder than checking without a modal on every draft.

## Validation method
AC-F4, AC-F8; keyboard-only; clinician task with seeded unsupported statement (planned).
