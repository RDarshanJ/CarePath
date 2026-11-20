# Prototype spec: longitudinal patient history (two approaches)

Brief: `docs/COMPONENT-BRIEF.md` section 20 ("two approaches to displaying longitudinal patient history"). Decision record: CD-241. Not built here; prototypes are rendered after the visual direction is chosen. Builds on `feature-research/J-patient-record.md` (selected: persistent summary with a contextual workspace, Timeline as the default section) and `component-research/05-clinical-data-presentation.md` (CD-211, CD-217). Keep exploration artifacts out of the production user experience (brief section 20); render under the design-alternatives area only.

## 1. Question being decided

How should a therapist see what happened to one patient over time: as one chronological list of events, or as time-aligned lanes by data type. Both must serve the same tasks and keep data classes separate.

## 2. Identical across both prototypes

**Viewport and context.** 1440 by 900 and 390 by 844. The `PatientBanner` (CD-200) and J's persistent summary with the "Not recorded" block and "Record as of" stamp are present and identical in both; only the workspace section differs. Same page chrome, same tabs (the workspace section switches inside the record).

**Typography, tokens, components.** Same type scale from `typography-exploration.md`; same semantic token roles (surface, border-subtle, text-primary, text-muted, tone success, warning, error, info, neutral; one mark role per data class, values taken from the chosen colour direction); same `StatusTag`/`StatusChip` forms and labels from CD-231 to CD-240; same `ObservationValue` text; same table component.

**Data (synthetic, one patient, 12 weeks, fixed so both render the same facts).** Content must come from existing contract shapes, not new fields:
- Plan versions: v1 published at week 0, v2 at week 5 with a change note, v3 at week 9 (`CarePlanVersion`, `publishedBy`, `publishedAt`).
- Sessions: 28 sessions over 12 weeks, with outcomes completed, one stopped_discomfort in week 6, two abandoned; `versionNumber` on each.
- Check-ins with patient-reported pain 0 to 10: 21 check-ins with two gaps (one of 9 days in weeks 3 to 4, one of 4 days), values in a realistic range for rehab and including one 7 or higher; one check-in reviewed, one not yet reviewed.
- Visits: initial evaluation week 0, follow-ups weeks 4 and 8 (completed), one video follow-up in week 11 (booked), one `no_show`.
- Review tasks: one reported-pain task resolved, one unreviewed-check-in task in review, one missing-intake task dismissed.
- Not collected: medications and allergies ("Not collected in CarePath"); no clinician-assessed values exist.
- Generated rows: none (AI summaries are a later phase).
Numbers are synthetic and labelled "Synthetic data" in the prototype footer; no numbers are claimed as research results.

**Tasks (same script for both).**
1. "What has changed since the last visit (week 8)?"
2. "Was the stopped session in week 6 before or after the plan change?"
3. "What did the patient report in the two weeks around the 9-day gap, and what is not known?"
4. "Which check-in still needs review, and open it."
5. "Find who published version 2 and why."
Success measures to record when evaluated (names only, no targets): task completion without error, number of interactions, time to answer, and whether the evaluator can state what is unknown (gaps, not collected).

**Constraints identical.** Pain labelled "Patient-reported" and never joined across a gap of more than 7 days; no verdict words; every row has its source in words (J provenance pattern: source word, actor, time); same states: loading per lane or per page section, empty line "None recorded", partial data with per-section retry, stale stamp.

## 3. What differs

### Approach A: unified chronological timeline with filters

- Structure: one newest-first list of events across all data classes (plan versions, sessions, check-ins, visits, review tasks), grouped under date headings, with a filter bar (data class chips as toggle buttons with counts, date range "Since last visit" default, "Changes only"). A "Since last visit" divider line sits at week 8.
- Each row: time, class word ("Patient-reported", "Activity", "Plan", "Visit", "Review"), one-line content, status per CD-231 to CD-240, actor.
- Gaps: a row "No check-ins Nov 3 to Nov 12" is inserted in the list.
- Detail: a row expands inline (disclosure) or opens a right drawer for a check-in or a version; keyboard: list with roving focus not required (native buttons per row).
- Pain values appear as `ObservationValue` text on rows; no chart in this prototype.
- Mobile: same list, filters in a disclosure.
- Hypothesis [untested]: a single story in time order answers tasks 1, 2, 4 and 5 fastest and is cheapest to build and make accessible; it is weaker for seeing the shape of pain.

### Approach B: time-aligned lanes (small multiples) with a table fallback

- Structure: one shared horizontal time axis (12 weeks, week ticks, "last visit" marker) and four stacked lanes labelled by data class: Plan versions (ticks with "v2"), Sessions (one mark per session with outcome shape and word on hover-free labels at week level), Patient-reported pain (CD-211 chart, 0 to 10, gaps marked), Visits and reviews (marks with words). Plan-version markers run through all lanes as thin guides with text labels.
- Each lane has its own legend entry and a "Table" toggle (CD-218); a combined chronological table is the keyboard and screen-reader primary path; lanes are `figure`s with summaries.
- Gaps: break and text in the pain lane and in the sessions lane ("No sessions weeks 6 to 7" only where scheduled sessions exist).
- Detail: selecting a mark is not required; marks are labelled and the table carries details; "Open check-in" is a link in the table.
- Mobile: lanes stack with a horizontally scrollable time axis (a labelled scroll region) and the table becomes the default view below 640 px, a documented change of interaction model with equivalent content.
- Hypothesis [untested]: seeing plan changes against sessions and pain together answers tasks 2 and 3 fastest and keeps data classes visibly separate; costs more to build and is harder on small screens and for screen-reader users, who depend on the table.

## 4. Evaluation plan

Render both from one data fixture, same tokens. Evaluate with the five tasks by heuristic walkthrough and a keyboard plus screen-reader pass (real participants are not available; no participant results may be claimed). Score with the protocol weights (task 25, accessibility 25, error prevention and trust 20, business 15, efficiency 10, cost 5) and record that scores are judgement. Gates that decide before scores: every data point reachable by keyboard and in text; gaps and "Not recorded" visible; no data class blended; passes at 400 percent zoom.
Provisional lean (before prototypes): A as the default workspace section with B's pain lane available as a chart inside a "Trends" view, because A is J's selected default and B fails more easily on narrow widths. Final choice only after the prototypes are compared.
