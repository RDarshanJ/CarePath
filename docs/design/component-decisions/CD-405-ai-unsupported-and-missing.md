# CD-405: Unsupported-statement warnings and missing-information items

| Field | Entry |
|---|---|
| ID | CD-405 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.6 |
| Date | 2026-11-20 |
| Screen or workflow | AI review panel |
| User segment | Caseload therapist (T1) |
| User task | Find and resolve every unsupported statement and gap before deciding |
| Business objective | AC-F3, REQ-AIS-02; unsupported per draft metric |

## Alternatives considered
- A. Per-statement status, flagged first, plus summary
- B. Summary banner only
- C. Colour or underline on text
- D. Confidence indicator

## References
- Google PAIR guidebook, explainability and trust (https://pair.withgoogle.com/chapter/explainability-trust/, read 2026-11-20)
- `docs/design/feature-research/M-ai-summaries.md` section 6 (Abridge, DAX Copilot for Epic, SPRY, Ambience, NYU Langone, Heidi; retrieved 2026-11-20)

## Research evidence
No page read describes a visible unsupported state (M section 7 gap 8); PAIR lists false precision for numeric confidence and recommends categorical states with an action each. B, C, D fail gates. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Words and icon; flagged items cannot be collapsed; counts in polite status region.

## Clinical and privacy constraints
No numeric confidence; Keep-with-a-note requires a visible note and is recorded.

## Interaction complexity
Medium.

## Technical feasibility
Needs verifier statement-level output (PRD section 11).

## Selected
A status chip per flagged statement, flagged first, missing information as its own section

## Rejected
B, C, D

## Decision rationale
Puts verifier output to work and makes absence visible.

## Validation method
Seeded unsupported statement appears first, cannot collapse, blocks decision; axe.
