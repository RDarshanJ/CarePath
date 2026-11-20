# CD-406: Authorship states: generated, edited, approved, clinician-written, signed

| Field | Entry |
|---|---|
| ID | CD-406 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.7 |
| Date | 2026-11-20 |
| Screen or workflow | AI review, note editor, history |
| User segment | Caseload therapist (T1) |
| User task | Tell at a glance who wrote text and what state it is in |
| Business objective | Prevent generated text being mistaken for clinician or signed record |

## Alternatives considered
- A. Rule, surface and fixed label per state
- B. Icon badges
- C. Colour tint only
- D. Separate containers until explicit insert

## References
- Carbon for AI (edited AI content reverts to default look, with restore)
- M-ai-summaries.md rules 1 and 4
- Usage matrix C8 (three names for the feature)

## Research evidence
Heidi shows a standing reminder line but no state vocabulary; SPRY states only after sign is the note final. B and C fail alone. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Labels are text, never truncated; rule style secondary; strike-through dropped for rejected.

## Clinical and privacy constraints
Approved is not signed; generated text enters a note only by "Use in note"; consent copy proposal needs advisor and legal review.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
A plus D separation, five fixed labels

## Rejected
B, C (decorative or colour-only)

## Decision rationale
Fixed words are the carrier; spatial separation prevents silent overwrite.

## Validation method
Label string tests; screenshot without colour; consent copy review.
