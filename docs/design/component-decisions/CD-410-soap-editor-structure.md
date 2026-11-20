# CD-410: SOAP note editor structure

| Field | Entry |
|---|---|
| ID | CD-410 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/07-clinical-documentation.md` section 7.1 |
| Date | 2026-11-20 |
| Screen or workflow | Record, visit note |
| User segment | Caseload therapist (T1) |
| User task | Document a visit in four sections and sign |
| Business objective | REQ-NOT-01; less documentation time without losing audit |

## Alternatives considered
- A. One rich-text document
- B. Four labelled plain-text sections with explicit insert-from-records
- C. Coded structured fields
- D. Transcript-first

## References
- SPRY, DAX sectioned notes (via M)
- Heidi template sections (Mobbin, via M)

## Research evidence
Sectioned notes are the pattern in DAX, Heidi, Ambience and SPRY. A loses section and source tracking. Weighted: A 2.95 (gate fail), B 4.25, C 3.00, D 3.25 (input path only). Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Each textarea labelled by its heading plus helper; single column at all widths; 200 percent zoom.

## Clinical and privacy constraints
Signed content immutable; AI text only by explicit insert and labelled; patient identity visible while writing.

## Interaction complexity
Medium.

## Technical feasibility
Feasible: ClinicalNoteVersion holds SOAP content; content format of text is an assumption.

## Selected
B

## Rejected
A (fails section and source tracking); C (no contract); D as input to B only

## Decision rationale
Smallest structure that preserves section and source attribution.

## Validation method
REQ-NOT-01 draft survives logout; axe; keyboard-only write.
