# 05 Clinical data presentation, including charts (family 5)

Protocol: `component-research/PROTOCOL.md`. Brief sections 12, 16, 18, 22. Access date for every external source: 2026-11-20. Decision records CD-210 to CD-220. Builds on `feature-research/E-progress.md` (selected E1: sections by data type) and `J-patient-record.md`; reusable rules are in `docs/design/data-visualization-guidelines.md`. Colours are not chosen here; only semantic token roles. Scores are heuristic. Evidence labels as in `02-patient-identity.md`.

## 0. Facts from the code

Read 2026-11-20: `packages/shared/src/contracts/progress.ts`, `apps/web/app/(patient)/_components/charts.tsx` (`WeeklyBars`, `PainLine`, `BarsLegend`), `(patient)/_components/table-toggle.tsx`, `(patient)/(app)/progress/page.tsx`, `(clinician)/_components/common.tsx` (`PainText`), `overview.tsx`, `tabs.tsx`, `intake.tsx`, `docs/design/component-usage-matrix.md` sections A2, C7, G8.

- Data that exists: weekly buckets (`assignedSessions` week-to-date, `completedSessions`, `stoppedSessions`, `completedActivities`, `skippedActivities`), up to 12 weeks; a `sessions` list (completed, stopped_discomfort, abandoned); `pain.points` (check-in date, integer 0 to 10, label always "Patient-reported", scale "0 to 10"); `goals` (target, unit, due). Observation enums in the database include `ObservationCategory` survey, activity, exam, vital_signs and `ObservationPerformerType` patient or practitioner, but the progress view surfaces only patient-reported pain; **no clinician-assessed value is returned by any contract**.
- Not stored: functional measures, range of motion, clinical assessments, medications, allergies. Goals have no current value.
- Today: charts exist only in the patient app (hand-built SVG, each with a table behind a toggle). The clinician sees the same endpoint as tables and sentences. "Pain n of 10 (patient-reported)" is rendered by `PainText`, again inline in `overview.tsx`, and as "pain of 7 out of 10" in the patient check-in result.
- Rules in force: AC-C2 (same counts for patient and clinician), AC-C7 (label "Patient-reported", no caption containing "improve", a table for every chart), REQ-PRG-02.

## 1. Evidence reviewed this session

| Source | URL | Observed |
|---|---|---|
| Ladder (iOS) "Steps Tracker" | https://mobbin.com/screens/933b5f24-7f06-42cf-a5a2-c54aabdd5468 | [Observed] Seven day bars with a dashed goal line, a value under each day and "--" under days with no data; summary "0 / 3d goal completed" and a Daily Breakdown list. Missing days are marked as text; a goal line makes absence read as failure. |
| Flo (iOS) "Cycle trends" | https://mobbin.com/screens/ce72a902-eec7-405c-949e-7235468e4483 | [Observed] "Your last 2 complete cycles were within the normal range" over two points joined by a line, a shaded "normal range (21-35 days)" band and its legend. A normal band plus a verdict sentence is interpretation; pain has no validated band in this product. |
| WHOOP (iOS) "Weekly Trends" | https://mobbin.com/screens/c21e12b1-e57d-427e-bc1d-2f3afd510edc | [Observed] Seven bars labelled with percentages, coloured green or yellow, above a line chart of another metric with value labels on every point; day labels under both. Percent labels give an exact value, but the bar colour carries an unexplained good/medium meaning. |
| Cal AI (iOS) "Progress" | https://mobbin.com/screens/a66164ef-7a59-4a18-ab4b-f02fc00f7b0f | [Observed] A BMI value on a four-band bar with a "Healthy" pill and a band legend with numeric ranges; "Expenditure Changes" rows with "Increase" and an arrow. Verdict words are attached to values. This is the pattern AC-C7 forbids for pain. |
| Insight Timer (iOS) "Mood Analysis" | https://mobbin.com/screens/7e11680b-9073-43dc-81e7-cb2a5f27d006 | [Observed] Weekly strip with two face marks joined by a line across days with no entries; no values. Joining across gaps is the thing CD-211 avoids. |
| Strava, Oura, Apple Health, Pliability, Alan | see `E-progress.md` section 6 | [Prior, not re-observed] Per-metric forms, day dot strips, hatched predicted data, "trend detected" caption (interpretation). |
| W3C WAI "Text alternatives for complex images" | https://www.w3.org/WAI/tutorials/images/complex/ | [Observed] Two parts: a short description and a long description in text, including values, trends and relationships; keep the long description available to everyone, ideally in the main content; a data table can be part of it; `aria-describedby` works for text only because tables and headings are flattened. |
| Carbon, data visualization dashboards | https://carbondesignsystem.com/data-visualization/dashboards/ | [Observed] Same colour for the same data set across a dashboard; same legend position and layout across charts; annotations must not obstruct data; important data gets highest contrast and area. |
| Carbon, colour palettes | https://carbondesignsystem.com/data-visualization/color-palettes/ | [Observed] Categorical palettes for unrelated categories, applied in order for contrast; gradients discouraged, multiple gradients often inaccessible; red danger, orange serious warning, yellow warning, green normal. The page did not state a not-colour-alone rule; I do not cite Carbon for one. |
| NHS CUI Patient Banner | https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben | [Observed] Unknown value shown as blank or words such as "Not Known"; "?" and "-" confuse users. Used here for missing-data wording. |
| GOV.UK tag, NHS tag | https://design-system.service.gov.uk/components/tag/ , https://service-manual.nhs.uk/design-system/components/tag | [Observed] Colour reinforces, text carries meaning; keep colours consistent. Applied to chart marks and legends. |

Not accessed: MedBridge, WebPT, SPRY, PhysiApp, MyChart results screens; CMS, USWDS, Material 3, Apple HIG (Health charts), Spectrum, Fluent, Polaris, Atlassian charts, NN/g and Baymard chart pages; WCAG pages (criteria cited by number from knowledge: 1.1.1, 1.3.1, 1.4.1, 1.4.3, 1.4.11, 2.5.8).

## 2. CD-210: labelling what kind of data a number is

**Task.** Read a value and know whose it is and what it measures: patient-reported rating, activity count, programme engagement, clinician-assessed measure, or goal. Needed on every screen that shows a number. **Healthcare constraints:** brief section 12 (patient-reported and clinician-assessed stay distinguishable; activity is not recovery). 

**Alternatives.** A: label in prose only where the author remembers (today, three renderings). B: section headings by data type plus a per-value source label (`SourceLabel` text) everywhere a value appears. C: icon or colour per source. D: one blended "progress" figure with a legend.

**Gates.** C fails (colour or icon as the only distinction). D fails (blends data types, breaks AC-C7). A and B pass, A inconsistently.

**Scores (default weights).** A 3,3,2,3,5,5 = 3.10; B 5,5,5,4,4,4 = 4.70; C 3,2,3,3,4,3 = 2.85 (ineligible); D ineligible. B arithmetic (125+125+100+60+40+20)/100.

**Selected B.** Four data classes and fixed labels: "Patient-reported" (pain, intake answers), "Activity" (sessions, activities done or skipped, stopped), "Engagement" is shown as "Sessions" with assigned versus completed and is never called progress, "Clinician-assessed" (reserved; no data today), "Goal set by your care team" (targets). Patient screen order follows E1: What you did, What you reported, Goals from your care team. Clinician screens carry the same labels. **Rejected:** A (inconsistent), C, D. **Rule:** a value from one class is never plotted on another class's axis; clinician-assessed values get their own lane and legend entry, shape plus text, and share an axis only when instrument and unit are the same.

## 3. CD-211: patient-reported pain over time

**Task and journey.** Patient: before a visit, check what I told my team. Clinician: see the pattern and the last values before deciding to review or change the plan. Question answered: "What did the patient report, and when?" Data: integer 0 to 10 at check-ins only (gaps are normal). Comparing values over time. [Judgement from E]

**Alternatives.** A: time-scaled point-and-line chart. B: points only. C: calendar heatmap with numbers. D: sparkline. E: table only.

**Gates.** D fails: no axis, units or dates, so it fails brief section 12 "show units, dates, legends". C is conditional: intensity encodes a number so the number must print in every cell (SC 1.4.1, 1.4.11), and a ramp reads as bands, which AC-C7 forbids. A, B, E pass.

**Scores (default weights).** A 5,4,4,4,4,5 = 4.30; B 4,4,5,3,4,5 = 4.10; C 3,2,3,3,3,2 = 2.70 (conditional); D 2,2,2,3,5,4 = 2.55 (ineligible); E 3,5,5,3,2,5 = 3.90 (kept as companion, not a replacement). A arithmetic (125+100+80+60+40+25)/100 = 4.30.

**Selected A**, with rules: y axis fixed 0 to 10 with ticks at 0, 5, 10 (never truncated or autoscaled); x axis time-scaled by date with at least first, last and every labelled point's date readable (direct label "Nov 18, 7"); markers always drawn; a connecting segment only between check-ins at most 7 days apart, a visible break and the text "No check-ins Nov 3 to Nov 18" otherwise (7 is the E1 value, [Assumption] untested); no smoothing, trend line, band, goal line, target or colour-by-value; title "Patient-reported pain, 0 to 10"; plan-version ticks on the axis with text in the table (E1 open question, recommended as small ticks). Chart plus table together (CD-218). **Runner-up B** (points only) is the safer form and is the switch if testing shows lines read as continuous measurement. **Rejected:** C (judgement risk, cost), D, E alone.

## 4. CD-212: weekly sessions, assigned versus completed

**Question.** "How many sessions did I (the patient) do against what was scheduled?" Counts per week, comparison across periods.

**Alternatives.** A: grouped bars, assigned (outline) next to completed (solid), values printed. B: one progress bar per week. C: stacked bars (completed, stopped, rest). D: numeric table only. E: donut of completed share.

**Gates.** E fails: a share of 100 percent invites a target and reads as a score, and the current week is partial. B conditional: a bar to fill implies a goal. A, C, D pass.

**Scores.** A 4,4,4,4,4,5 = 4.05; B 3,4,3,3,4,3 = 3.35; C 4,3,4,3,3,3 = 3.45; D 3,5,5,3,3,5 = 4.00. A arithmetic (100+100+80+60+40+25)/100. A and D are close; the table stays as D's role (CD-218).

**Selected A.** Rules: no percentage, no "streak", no target line; the current week's bar gets a dashed outline and the text "so far this week" (assigned is week-to-date per the contract); `stoppedSessions` is printed as a number beside the week ("1 stopped for discomfort"), not a coloured segment; the word is "sessions", not "progress". Existing `WeeklyBars` and `BarsLegend` stay; add the partial-week treatment. **Rejected:** B, C (colour segments invite a verdict), E.

## 5. CD-213: this week at a glance

Alternatives: A day strip (list of seven days, each with a text word: Done, Planned, Rest, Stopped, Not done); B month calendar heatmap; C none. Heatmap fails to be neutral (a grid of unmarked missed days is the most judgemental view, E2) and needs a labelled grid with arrow keys; selected A. Scores: A 4,5,4,4,4,4 = 4.25; B 4,3,3,3,3,2 = 3.20; C 2,5,3,2,5,5 = 3.40 (A arithmetic (100+125+80+60+40+20)/100 = 4.25). Spec: an ordered list (`ol`) of seven items "Mon: Done", with an icon plus the word; "Not done" is neutral wording; days after today read "Planned" or "Rest"; derived from the `sessions` list with `weeks=1`; no new endpoint. Month heatmap deferred (E2).

## 6. CD-214: numerical summaries and progress bars

Reuse the established pattern: a text-first sentence ("3 of 3 planned sessions so far this week") is the primary summary; the `Progress` bar stays only for in-flow progress (onboarding steps, session exercises, Today's current session) where it shows position in a process, never achievement. No progress bar, ring or percentage for goals, for pain, or for weekly engagement. No alternatives invented (conventional). Numbers: tabular numerals, unit words next to numbers ("sessions", "of 10"), never a bare number.

## 7. CD-215: summaries inside lists

**Task.** Clinician scanning the directory, queue or overview wants "has this patient reported lately, and what was the last value". 

**Alternatives.** A: sparkline per row. B: text summary of latest value, date and count. C: seven-dot week strip. D: nothing.

**Gates.** A fails: no axis, units, dates or direct labels, and tiny slopes read as a trend, which AC-C7 forbids as caption and which the brief warns against for misleading smoothing.

**Scores.** B 4,5,5,4,5,4 = 4.55; C 3,3,4,3,3,2 = 3.15; D 2,5,3,2,5,5 = 3.40; A 3,2,2,3,4,3 = 2.65 (ineligible). B arithmetic (100+125+100+60+50+20)/100.

**Selected B**: "Pain 6 of 10 (patient-reported), Nov 18. 5 check-ins in 14 days." as plain text; "No check-ins in 14 days" when none (not blank). The 14-day window is [Assumption]. **Rejected:** A everywhere in lists; sparklines are allowed only inside a chart that has its axis. Uses `ObservationValue` (CD-220). Needs `lastCheckIn` and a count in the list read: [Dependency, check `patients.ts` list item; if absent, request via contract-requests].

## 8. CD-216: clinician view of the same data

**Alternatives.** A: tables and sentences only (today). B: the same chart components as the patient, in a clinician layout with the table visible by default. C: a separate analytic dashboard. D: patient layout unchanged.

**Scores.** A 3,5,4,3,3,5 = 3.80; B 5,4,5,4,4,4 = 4.45; C 3,3,3,3,3,1 = 2.90; D 3,4,4,3,4,5 = 3.65. B arithmetic (125+100+100+60+40+20)/100.

**Selected B.** Chart and table side by side (table first on narrow), identical values from `GET /patients/:id/progress` (AC-C2); 12 weeks available, 4 default; clinician extras limited to what the data holds: plan-version ticks, "Reviewed" marks on check-ins, and the session outcome vocabulary of CD-240. Components live in a shared package location, not in the patient route group (usage matrix G8). Rejected: C (cross-patient analytics belong to admin analytics N, not this family), A, D.

## 9. CD-217: missing, partial and stale data

Safety rule, not a stylistic choice, so only one structure is evaluated. Rejected as gate failures: leaving the gap blank, filling zero, joining across the gap, interpolating or smoothing (each fabricates a value or hides an absence).

| State | Treatment |
|---|---|
| No check-ins ever | "No check-ins yet. Ratings appear here after your first check-in." (patient); "No check-ins recorded" (clinician) plus link to the action |
| Gap inside window | Break in the line and axis text "No check-ins Nov 3 to Nov 18" |
| Current week partial | Dashed outline and "so far this week" |
| One component failed to load | Per-section error with retry, headings kept; summary line "Could not load check-ins. Try again." |
| Stale | "Check-in data is 3 hours old" with Refresh (J) |
| Not collected or not held | "Not recorded" or "Not collected in CarePath", never "-" or "?" (NHS evidence) |
| Instrument absent | Clinician-assessed lane not rendered; no placeholder implying it exists |
| Single point | One marker with label; no line; text "1 check-in" |

## 10. CD-218: text alternatives

**Alternatives.** A: `role="img"` with a long `aria-label` plus a table behind a toggle (today). B: `figure` with `figcaption` holding a one-sentence summary, plus the real data table in the main content (disclosure for patients, visible for clinicians). C: table only. D: `aria-describedby` to a text description.

**Gates.** D alone fails for tables (W3C: tables are flattened [Observed]). A passes if the label is complete, but puts the long description inside an attribute. 

**Scores.** A 3,4,4,3,4,5 = 3.65; B 5,5,5,4,4,4 = 4.70; C 3,5,5,3,2,5 = 3.90; D 3,3,3,3,4,5 = 3.20 (ineligible alone). B arithmetic (125+125+100+60+40+20)/100.

**Selected B.** Spec: `figure` > chart SVG with `role="img"` and a short `aria-label` naming the chart and where the detail is; `figcaption` with the neutral count sentence (no evaluative words; automated test); table as `Table` with caption, `th scope`, equal values; the toggle button states "Show weekly sessions as a table" and keeps the table in the DOM order after the figure. Marks have at least 3:1 non-text contrast against their background (SC 1.4.11 [Standard]); legend text 4.5:1; legend position consistent across charts (Carbon [Observed]). Direct labels replace tooltips (hover is not an access path). Reduced motion: no animated draw-in.

## 11. CD-219: goals

Reuse the established list pattern: description, target value and unit, due date, and the fixed line "Measured at your visits. Not tracked here." (E1). No bars, rings or "on track" words because goals hold no current value. Placed above the session log. Clinician view shows the same list plus the plan version that set it. No alternatives invented.

## 12. CD-220: one way to print a clinical value

**Problem.** Three renderings of patient-reported pain (`PainText`, an inline copy, check-in result copy) and "of 10" versus "out of 10".

**Alternatives.** A: leave as is. B: one formatter function. C: one `ObservationValue` component (label, value, unit or scale, source label, date, optional note).

**Scores.** A 2,3,2,3,5,5 = 2.85; B 4,4,4,4,4,5 = 4.05; C 5,5,5,4,4,3 = 4.65. C arithmetic (125+125+100+60+40+15)/100.

**Selected C.** Clinician form: "Pain 7 of 10 (patient-reported), Nov 19". Patient form inside "What you reported": "Pain 7 of 10", date; chart and table keep "Patient-reported" explicitly. Always "of 10", never "out of 10". Value in `tabular-nums`; scale words next to the number (units rule). The component takes strings and never decides tone: no colour by value, no icon. Rejected A, B (B drifts back to inline copies; revisit if cost matters). Testing: snapshot of every context that prints a pain value; a test that no caption or label matches improve, worse, better, recover.

## 13. Testing summary for the family

Automated: axe on /progress and record tabs at 375, 768, 1440; table and chart value equality test (patient versus clinician, AC-C2); banned-words test on captions; chart gap-rule unit test (7-day threshold, single point, empty). Manual: screen-reader read of a chart figure; 200 percent text; forced-colours mode (marks must remain distinguishable); comprehension test with synthetic scenarios (E section 12), not run.
