# CD-401: AI approval granularity: whole draft with section progress

| Field | Entry |
|---|---|
| ID | CD-401 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.2 |
| Date | 2026-11-20 |
| Screen or workflow | AI summaries decision |
| User segment | Caseload therapist (T1) |
| User task | Take responsibility for the summary once |
| Business objective | Defensible audit trail; one AIReview per generation (PRD, domain model) |

## Alternatives considered
- A. Whole-draft decision with section progress
- B. Section-level approval
- C. Per-statement accept or reject
- D. Auto-accept supported statements

## References
- `docs/design/feature-research/M-ai-summaries.md` section 6 (Abridge, DAX Copilot for Epic, SPRY, Ambience, NYU Langone, Heidi; retrieved 2026-11-20)
- DAX SmartSections and SPRY section edits (via M)

## Research evidence
Section-level structure exists in products (DAX, SPRY) but the pages read do not describe per-section sign-off. Weighted: A 3.95, B 3.55, C 2.80; D ineligible (content enters record without clinician action). Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Per-section controls would repeat names; progress counts are text in a polite status region, debounced.

## Clinical and privacy constraints
Never approve unseen text (AC-F8); decision recorded per generation with reviewer and time (AC-F4).

## Interaction complexity
Low: counters only.

## Technical feasibility
Feasible: matches current AIReview model; section-level needs schema change.

## Selected
A: whole-draft decision, section progress as text counters

## Rejected
B (not in model, blurs accountability); C (click-through risk); D (fails safety gate)

## Decision rationale
The decision unit in the data is the generation; progress counters borrow the benefit of D from M without partial approvals.

## Validation method
Seeded-draft run: counts update, decision unavailable until items resolved; clinician test of whether whole-draft is too coarse (planned).
