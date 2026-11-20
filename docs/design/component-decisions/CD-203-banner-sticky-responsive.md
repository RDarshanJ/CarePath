# CD-203: Banner stickiness, compact form and page title

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/02-patient-identity.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-203 |
| Screen or workflow | Banner at 375 to 1920 |
| User segment | Therapist |
| User task | Keep identity in view without hiding content or focus |
| Business objective | Safety and usability |
| Candidate alternatives | Always sticky; sticky compact; non-sticky; sticky with auto-unstick when tall |
| Production and standards references | component-research/02-patient-identity.md section 4; NHS CUI Patient Banner (community-hosted copy) https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben, accessed 2026-11-20 (fixed, unobscured; scroll behaviour implied only); WCAG 2.2 SC 2.4.11, 1.4.10 (from knowledge) |
| Research evidence | Not scored (conventional, rule-based). The 30 percent unstick threshold is a judgement to test. |
| Accessibility considerations | One-line compact bar below 1024; scroll-padding-top equals bar height; unstick above 30 percent viewport height; document.title has no patient name |
| Clinical and privacy constraints | Browser title and history would otherwise persist the name |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | Compact sticky bar below 1024, full banner from 1024, auto-unstick when tall, title "Patient record | CarePath" |
| Rejected | Always sticky full height (fails at zoom); non-sticky |
| Rationale | Identity stays visible without blocking focus or reflow |
| Validation method | 400 percent zoom, 200 percent text, keyboard tab through long forms |
