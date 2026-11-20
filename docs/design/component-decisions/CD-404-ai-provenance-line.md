# CD-404: Generated-content provenance line

| Field | Entry |
|---|---|
| ID | CD-404 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.5 |
| Date | 2026-11-20 |
| Screen or workflow | Every generated block |
| User segment | Caseload therapist (T1) |
| User task | Know who or what produced text, from what, and when |
| Business objective | AC-F10 string; audit; trust calibration |

## Alternatives considered
- A. Fixed text provenance line
- B. Icon badge
- C. Hover or popover only
- D. Colour tint

## References
- Google PAIR guidebook, explainability and trust (https://pair.withgoogle.com/chapter/explainability-trust/, read 2026-11-20)
- Carbon for AI (label opens explanation; styling uses glow, not adopted)

## Research evidence
Carbon uses a consistent AI label with an explanation popover; PAIR asks for disclosure of data used. B, C, D fail gates (decorative, hidden, colour-only). A only eligible. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Text at caption size, `ink-muted`; popover is supplementary; no information only in tooltip.

## Clinical and privacy constraints
Provider name exact; deterministic provider reads "Demo provider, rule-based"; no sparkle.

## Interaction complexity
Low.

## Technical feasibility
Feasible: fields exist on AIGeneration.

## Selected
A fixed text provenance line with "How this draft was made" popover

## Rejected
B, C, D (fail gates)

## Decision rationale
Words carry provenance; the label is the carrier, not an icon.

## Validation method
AC-F10 assertion; screenshot without colour.
