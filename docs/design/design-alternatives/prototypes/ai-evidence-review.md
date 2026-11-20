# Prototype spec: AI evidence review (two approaches)

Brief section 20 ("Two AI evidence-review approaches"). Not built. This file says what is held identical and what differs so the two prototypes can be rendered after the visual direction is chosen and compared fairly. Related: `docs/design/component-research/06-ai-verification.md` (CD-400 to CD-409) and `docs/design/feature-research/M-ai-summaries.md`. Date: 2026-11-20. No participants have been involved; nothing below is a result. Exploration artifacts stay outside the production user experience (brief section 20).

## 1. Question the comparison answers

Does a review panel with evidence in an on-demand drawer (Approach 1) or one with a docked, always-visible source pane (Approach 2) lead a therapist to find unsupported statements, open evidence before deciding, and decide with less effort, without lowering scrutiny?

Both approaches use the same gated decision (CD-407), the same statement statuses (CD-405), the same authorship labels (CD-406) and the same provenance line (CD-404). Only the evidence mechanism and the layout that follows from it differ.

## 2. Identical in both prototypes

**Tokens and type.** Whatever theme tokens the chosen visual direction supplies, applied identically; token roles used: `surface`, `surface-sunken`, `ink`, `ink-muted`, `border-control`, `primary`, `ai-rule`, `warning-*`, `info-*`, `success-*`, `error-*`. No new colours, no gradient or glow, no sparkle, no confidence figure, no icon beside every heading. Same type scale and spacing; same `StatusChip`, `Banner`, `DrawerContent`, `Button` and `EvidenceRef` components.

**Viewports.** 1440 x 900 (primary, desktop), 1024 x 768, 390 x 844; 200 percent zoom at 390 and 1440 for the accessibility pass.

**Synthetic data (invented for this exercise, not real patient data).** Patient "Sample Patient A" (synthetic), clinic time zone shown with abbreviation, period 3 Nov to 17 Nov 2026, provider "Demo provider, rule-based", generated 17 Nov 2026 9:02 AM.

Source records (all patient-reported or system records, labelled as such):

| Ref | Source | Date | Content |
|---|---|---|---|
| R1 | Check-in | 5 Nov | Pain 6 of 10 (patient-reported); difficulty "Moderate" |
| R2 | Check-in | 8 Nov | Pain 5 of 10 (patient-reported) |
| R3 | Check-in | 12 Nov | Pain 5 of 10 (patient-reported); note "Knee felt stiff in the morning." |
| R4 | Session | 6 Nov | Completed, 4 of 4 exercises |
| R5 | Session | 10 Nov | Stopped for discomfort during exercise 3 (Step-ups); discomfort 7 of 10 (patient-reported) |
| R6 | Session | 13 Nov | Completed 3 of 4 exercises; exercise 2 skipped, reason "Not enough space" |
| R7 | Plan version | 3 Nov | Version 3 published by a therapist |

Generated statements (8), in sections, with verifier status:

| # | Section | Statement | Refs | Status |
|---|---|---|---|---|
| 1 | Summary | Three sessions were recorded between 3 Nov and 17 Nov 2026. | R4, R5, R6 | Supported |
| 2 | Reported changes | The patient reported pain of 6 of 10 on 5 Nov and 5 of 10 on 8 Nov and 12 Nov (patient-reported). | R1, R2, R3 | Supported |
| 3 | Reported changes | The patient reported morning stiffness in the knee on 12 Nov. | R3 | Supported |
| 4 | Reported changes | The session on 10 Nov was stopped for discomfort during exercise 3. | R5 | Supported |
| 5 | Engagement | The patient completed all assigned exercises in every session. | none | No supporting record found |
| 6 | Engagement | One exercise was skipped on 13 Nov because of limited space. | R6 | Supported |
| 7 | Engagement | The patient has been doing the home exercises at the recommended pace. | none | No supporting record found |
| 8 | Review items | Review the session stopped for discomfort on 10 Nov. | R5 | Supported |

Missing information (2): "No check-in recorded between 13 Nov and 17 Nov." and "Sessions were recorded on 3 of 5 assigned days."

No statement states a trend or improvement for patient-reported pain; the wording above is deliberate (M section 5 weakness 4).

**Identical elements and strings.**
- Block header: "Draft, generated, not reviewed" and provenance line: "Generated draft. Provider: Demo provider, rule-based. Based on 7 records from 3 Nov to 17 Nov 2026. Generated 17 Nov 2026, 9:02 AM." plus a "How this draft was made" button.
- Summary line: "8 statements: 6 supported, 2 with no supporting record. 2 items of missing information."
- Statement status text: "Supported" (plain text with icon) and "No supporting record found" (warning chip); flagged statements first within their section and never collapsed.
- Actions per flagged statement: "Edit statement 5", "Remove statement 5", "Keep statement 5 with a note".
- Missing information section with an "Acknowledge" button per item.
- Decision bar (sticky bottom, identical in both): reason line when unavailable ("Approve is unavailable: 2 statements have no supporting record, and missing information is not acknowledged."), then "Approve draft" (becomes "Approve draft with edits" once any edit exists) and "Reject draft".
- Persistent consequence copy when approved: "Approved by {name} at {time}. Original draft and your edits are kept in record history. Approved, not yet part of a signed note."
- Consent, loading and failure states use the CD-408 wording.
- Evidence content per ref: source type in words, date and time, the supporting field with the label "Supports this statement", and "Open full record".
- Navigation, patient identity strip, page heading and surrounding record chrome identical.

## 3. What differs

| | Approach 1: review panel with evidence drawer | Approach 2: review panel with docked side-by-side source pane |
|---|---|---|
| Evidence mechanism | `EvidenceRef` buttons open a right drawer (CD-400 A) | A source pane is always visible beside the draft; selecting a statement or a ref scrolls the pane to the matching record and marks the supporting field (CD-400 B) |
| 1440 layout | Review panel at reading width (about 2/3); drawer overlays the right third without covering the selected statement; closed by default | Two columns: draft left, source pane right, both scroll independently; pane shows all 7 records in date order, the matching one marked |
| 1024 layout | Drawer overlays the content (non-covering of the statement not guaranteed; statement text repeated at the top of the drawer) | Pane collapses to a tab ("Sources") above the draft; selecting a ref switches to it |
| 390 layout | Bottom sheet, statement text repeated at top | Stacked: the matching source appears as an inline block directly under the statement when selected |
| Default eye path | Draft first; evidence on demand | Draft and sources together from the start |
| Search in source | not present (sources are short) | "Search records" field in the pane |
| Source-failure state | In the drawer: "Source could not be opened. This statement is not counted as checked." | In the pane for that record, with the same text |
| Evidence-open event | Recorded when the drawer content rendered | Recorded when the matching record was selected and rendered |

Everything else is the same code path.

## 4. States to render for both (each viewport where noted)

1. Default draft (1440, 1024, 390).
2. Evidence open for statement 2 (three refs; one failing to load as a variant).
3. Statement 5 (unsupported) selected with its three actions; decision unavailable with reason.
4. Statement 5 edited ("Edited by {name}"), original shown through the disclosure; decision label changes to "Approve draft with edits".
5. "Keep statement 7 with a note": note field open, then the kept state.
6. All resolved, decision available; approved state.
7. Source unavailable; offline (decision disabled, edits kept); stale ("New records since this draft was made (2)").
8. Loading ("Generating a draft from 7 records. This can take up to 20 seconds."), consent refusal, provider timeout.

## 5. Accessibility acceptance (both)

Keyboard-only completion of the whole task; focus returns to the originating ref when the drawer closes (Approach 1); the docked pane and the draft are separately focusable named regions with no focus trap (Approach 2); 320 px reflow without horizontal scroll; focus never hidden behind the sticky bar or the pane (2.4.11); statuses announced politely and debounced; every status carried by words and icon; target sizes 24 px minimum; axe has no serious or critical issue; screenshots reviewed in greyscale to confirm nothing depends on colour.

## 6. Evaluation plan (not run)

| Measure (names only; no target values) | How |
|---|---|
| Time from draft shown to decision | Moderated task timing |
| Unsupported statements noticed before the decision | Seeded statements 5 and 7 |
| Share of statements opened for evidence before the decision | Evidence-open events |
| Approvals attempted with unresolved items | Should be zero because the control is gated; count attempts |
| Errors and recoveries (failed source, stale draft) | Observation |
| Perceived effort and trust | Short post-task questions; wording to be set before the test |
| Preference and reasons | Post-task interview |

A moderated comparison with clinicians has not been run and none is claimed. Any outcome statement in later documents must say how many people took part and who they were. Until then the table in 06-ai-verification.md section 6.1 (heuristic scores) is the only evaluation, and it is judgement.

## 7. Selection rule written before rendering

Choose Approach 1 as the default for structured-record progress reviews unless the comparison shows that therapists open fewer sources, or take materially longer to find unsupported statements, than with Approach 2; choose Approach 2 for the note-from-transcript draft at 1280 px and above either way (M recommendation). Record the outcome in `docs/design/component-decisions/CD-400-ai-evidence-mechanism.md` with the evidence and its limits.
