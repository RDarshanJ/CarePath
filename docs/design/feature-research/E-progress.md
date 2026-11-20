# Feature E: Patient progress

Status: provisional until advisor sign-off. Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` section 7 E. Access date for every external source: 2026-11-20. No colours are chosen here.

## 1. User problem

A patient wants to know whether the effort is adding up and what their care team can see. What the app actually holds is counts of sessions and exercises they did, and pain ratings they typed in. Those are different kinds of data with different meanings. The risk is a progress screen that treats all of it as one story ("you are improving") when the app has measured only activity and self-report, and never function or clinical assessment.

## 2. User and context

- Who: the same active patient as Today, mostly on a phone; also looks at it on a laptop before a visit. May be discouraged after a bad week, or anxious about a pain rating. [Assumption]
- State: a patient who missed sessions or stopped for discomfort should not feel graded. A patient with a good week should not be told they have recovered.
- Frequency: weekly, and before appointments. Not daily.
- Shared view: clinicians read the same endpoint, so the numbers a patient sees are the numbers the therapist sees (AC-C2).

## 3. Business objective

Help patients see their effort and share what they report, so conversations at visits are better informed, without claiming clinical outcomes the product did not measure.

Metric names only: progress screen reach (share of active patients who open it in a week); table-toggle use (a proxy for chart comprehension difficulty, if it appears); check-in completion rate; clinician-reported discrepancy between what patient and clinician views show (should be none, by AC-C2); patient comprehension in testing (see validation).

## 4. Constraints

Functional, from `packages/shared/src/contracts/progress.ts`:

- `ProgressView` gives up to 12 weekly buckets (`weeks`, default 4), each with week-to-date `assignedSessions`, `completedSessions`, `stoppedSessions`, `completedActivities`, `skippedActivities`; a `sessions` list (id, status completed, stopped_discomfort or abandoned, start and end time, plan version, activity counts); `pain.points` (date, score 0 to 10, one per check-in, labelled "Patient-reported", no trend caption); and `goals` (description, target value and unit, due date).
- What the data is, in the brief's terms: activity completion = sessions and activities done or skipped; programme engagement = completed versus assigned by week; patient-reported outcome = pain 0 to 10 at check-ins. Not present: functional goals (a goal has a target but no current measurement), clinical assessments (none are stored), and any mobility or range-of-motion value.
- Assigned sessions in the current week are week to date, so the current week is not comparable with complete weeks; copy must say "so far this week".
- Pain exists only on days with a check-in, so there are gaps. The data does not say why a day is missing.
- Rules from the PRD: label pain "Patient-reported"; no caption may contain "improve" (AC-C7); every chart has a table with equal values; no fabricated data in charts.

Technical: charts are hand-built SVG (`apps/web/app/(patient)/_components/charts.tsx`) with a `TableToggle`; the pain line is time-scaled by date.

Safety and privacy: the screen shows health information; no sharing or export is offered here; a high pain value is handled by the check-in flow's own rule, not by this screen. No predictions, no thresholds, no "good" or "bad" bands.

Accessibility: each chart has a text summary and an equal table (SC 1.1.1); meaning not by colour alone (SC 1.4.1), and graphical marks distinguishable (SC 1.4.11, non-text contrast); label data points directly; keyboard reachable toggles; reduced motion respected; the table must be real table markup. Checked against the W3C Understanding page for [use of colour](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

## 5. Current CarePath implementation

Read: `apps/web/app/(patient)/(app)/progress/page.tsx` (243 lines), `charts.tsx`, and screenshots `docs/screenshots/3.4b/c11-progress-390.png`, `c12-progress-tables-*`.

Page order: intro ("counts and your own ratings, not a measure of recovery"); "This week" sentence ("3 of 3 planned sessions so far this week"); grouped bars of assigned (outline) versus completed (solid) per week with direct value labels and a legend; "Show weekly sessions as a table"; "Patient-reported pain" line chart with a plain explanation, point labels when 8 or fewer, and a table toggle; a full "Sessions" list (15 rows in the capture); "Goals set by your care team" with "CarePath does not score them".

What works: honest framing; each metric labelled by what it is; direct labels on bars; both charts have equal tables; pain is time-scaled and has no trend line or verdict; empty states say what will appear and when.

Weaknesses:

1. Data types are not separated visually. Activity counts, a patient-reported rating and clinician goals sit as sibling sections with the same heading level, so a reader cannot tell at a glance which are effort and which are self-report.
2. The pain line joins points across gaps (for example Oct 27 to Nov 19 has check-ins on only some days), which can read as continuous measurement. Missing days are not marked.
3. Only first and last dates are labelled on the pain x-axis, so most points have no date unless the table is opened.
4. The session list is long and sits above Goals, pushing goals (the thing the patient is working towards) to the bottom of a 2,900 px page.
5. Goals show a target but not what the patient is measured against; there is no stated "this is not tracked here" line for functional goals other than the closing sentence.
6. Plan changes are not marked on either chart, so a patient cannot tell whether a dip lines up with a plan change (their therapist sees the version in the session list).
7. A weekly "so far" bar for the current week uses the same visual weight as complete weeks, so an in-progress week looks short. The legend does not say the last bar is partial.
8. No calendar view of which days were done, skipped, stopped or rest days.

## 6. Production references observed

Same Mobbin method and limits as Feature B (preview frames only). Links are Mobbin pages.

| Product | Platform | Screen or flow | URL | Observed |
|---|---|---|---|---|
| Strava | iOS | "Progress (subscribed)" | https://mobbin.com/flows/82d97399-07a6-44db-8b21-8ced13b7b26b | [Observed] A "You" screen with a Progress tab: "This week" figures with a 12-week line, a "Best Efforts" list, a month strip with streak and day circles (done days marked), a "Goals" ring ("1 / 2 runs completed"), a "Training Log" week dot row, and a locked "Performance Predictions" teaser ("You need 5 more runs to see your predictions"). Range tabs 7D, 1M, 3M, 6M, YTD, 1Y with a plain sentence ("Your progress at a glance"). Empty data shows a flat line at zero and "We haven't detected any activities..." text. |
| Oura | iOS | "Trends" and "Daily readiness data" | https://mobbin.com/flows/f8d12457-bbde-4038-a6a6-9c9a85a66412 and https://mobbin.com/flows/1a062e29-239c-4971-94cd-292b42dfcc7c | [Observed] An 8-week bar chart with a dashed baseline and an explicit caption "TREND DETECTED: your activity goal completion rate has trended down over the past 8 weeks but is still on par with your baseline"; separate cards per metric (inactive time bars, resting heart rate line) each with a headline value and "Avg. this week". A 7-day readiness line with a score ring. Different metric, different chart type. |
| Apple Health | iOS | Summary; Cycle tracking highlights | https://mobbin.com/flows/6fd21fc4-6319-49b6-8b00-8c9edc0058b6 and https://mobbin.com/flows/fd92a700-2d74-437d-8083-6d3f09f0c4f5 | [Observed] Pinned metric cards (Steps with a day bar chart), user-edited; a calendar with predicted days shown with hatched fills and a day marker, plus "Cycle History" rows. Hatching is used to separate predicted from logged, not colour alone. |
| Pliability | iOS | "Welcome series" | https://mobbin.com/flows/419e86f5-96b9-4ee9-b81e-4f1e32a0c300 | [Observed] "Completed 0 of 5", then path progress (percent, week, routines left) as three plain figures and a bar. |
| Alan | iOS | Program detail | https://mobbin.com/flows/a2c9f648-eac5-43a9-b41d-9ec099ea8c78 | [Observed] "Day 2/14" with a dotted tracker across the programme. |
| Hinge Health | iOS | Not on Mobbin | https://www.hingehealth.com/how-it-works/experience | [Observed, official page text] The page says progress is tracked through movement analysis (TrueMotion) and a progress-tracking FAQ exists; it gives no screen detail. Not inspected visually. |
| Sword Health | iOS | Not searched on Mobbin | https://apps.apple.com/us/app/sword-health/id1468523447 | [Observed, listing text] Move "integrates with Health Kit to track activity and step goals"; no other progress feature described. |
| WHOOP, Fitbit, Flo | iOS | First-week review, week circles, history rows | `docs/research/mobbin-patterns.md` section 9 | [Prior research, not re-observed] WHOOP full-screen story review (linear, long); Fitbit seven day circles and Week/Month/Year tabs; Flo dotted history rows with a colour legend. |
| Not accessed | | MedBridge, WebPT, PhysiApp, Omada, Maven, MyChart (results), Hinge Health screens | | Not found on Mobbin in today's searches; no screens inspected. |

## 7. Established patterns

1. Different metrics get different forms. Oura gives every metric its own card with its own chart type and a headline number; Strava separates a week total, a goal ring, a log of days and a 12-week line. It works because the form signals what kind of thing is being counted.
2. Calendar or dot rows for "did I show up". Strava's month strip, Fitbit's day circles and Alan's dotted tracker show a done or not-done record per day with no scale to misread.
3. Lines for continuous series, bars for per-period counts. Strava and Oura follow this; Strava's flat zero line for an empty period is a cautionary example of a chart that says nothing.
4. A plain sentence under the chart. Strava's "Your progress at a glance" and Oura's trend caption. These help, but Oura's "trend detected" is interpretation. CarePath's AC-C7 forbids interpretive captions on pain, so only neutral count sentences are allowed.
5. Predicted or missing data is marked in the graphic. Apple Health hatches predicted days; Strava states "You need 5 more runs to see predictions" when data is insufficient. This supports an explicit "not enough data" and "no check-in that day" treatment.
6. Failure modes: story or streak formats pressure and take time (WHOOP review, Strava streak flame); computed scores read as verdicts; colour-only legends (Flo).

## 8. Alternatives

### E1. Sections by data type, form matched to data

- Problem addressed: patient cannot tell effort from self-report from goals.
- Interaction model: three labelled groups in order. (a) "What you did": a week-by-day strip for the current week (done, planned, rest, stopped, each with a text mark) above the weekly bars for 4 to 12 weeks, with the current week marked "so far". (b) "What you reported": pain line, time-scaled, with each check-in a labelled point, gaps left as gaps (no line across more than a set span, say seven days, plus a visible "No check-in" note), plan-version markers on the axis, "Patient-reported, 0 to 10". (c) "Goals from your care team": the goal list with target and due date and the line "Measured at your visits, not tracked here." The session log moves to the bottom behind a "See all sessions" disclosure or its own page. Each chart keeps its table.
- Benefits: preserves the "engagement is not improvement" separation; reuses existing charts; closest to Oura and Strava's per-metric forms.
- Limitations: no single "how am I doing" answer (deliberately); the week strip needs per-day data, so one `weeks=1` read of `sessions` (already returned) is needed.
- Accessibility: strip is a list with text per day; points directly labelled; tables retained; gap marker is text.
- Business: supports informed visits; neutral on engagement.
- Technical complexity: low to medium. All data present in `ProgressView`. Plan-version markers need `versionNumber` per session (present) to derive change dates.
- Error and recovery: if `progress` fails, show the retry and keep headings; if pain is empty, show "No check-ins yet" with the link to check in (existing).
- Evidence: R (Oura, Strava, Apple Health patterns); J (gap handling and plan markers); existing PRD rules.

### E2. Calendar-based activity tracking

- Problem addressed: see consistency over time at a glance.
- Interaction model: month grid, each day marked done, skipped part, stopped, planned-not-done, rest, with pain shown as a number on days with check-ins. Tap a day for its session and check-in.
- Benefits: familiar (Strava, Fitbit, Apple Health); makes gaps and rest days obvious.
- Limitations: "planned-not-done" days look like failures; a grid of missed days is the most judgemental possible view; marks need shape plus text; dense at 375 px; pain on a calendar hides its trend.
- Accessibility: needs a grid with labelled cells and keyboard arrow navigation, or a list alternative; non-trivial.
- Business: may raise consistency; risk of guilt-based pressure.
- Technical complexity: medium (calendar grid and per-day join); the API caps at 12 weeks so a month view works but a year view does not.
- Error and recovery: a day with missing data cannot be told apart from a day with no activity unless the server says so.
- Evidence: R (Strava, Fitbit in prior research, Apple Health); J (risk of shaming).

### E3. Weekly summary cards and narrative

- Problem addressed: patient does not want to read charts.
- Interaction model: one card per week with a short generated sentence ("You did 3 of 3 planned sessions. Pain ratings ranged from 3 to 5.") and an expand for detail.
- Benefits: fast to read; works for low-numeracy readers.
- Limitations: any generated sentence is interpretation; wording drifts toward "improved"; hides the shape of pain over time; sentences duplicate the table.
- Accessibility: good (text first); must avoid colour-coded verdicts.
- Business: friendly; higher legal and trust risk.
- Technical complexity: low if templated; higher if generated, and AI-written health summaries are out of scope for patients here.
- Error and recovery: if a sentence is wrong it is a content error, not a chart error; harder to catch.
- Evidence: R (Strava "at a glance" sentences, Oura captions); J (risk).

### E4. Milestone timeline with context

- Problem addressed: connect what happened (plan changes, visits, goal dates, check-ins) to the numbers.
- Interaction model: one reverse-chronological timeline: plan versions, visits, goals due, stopped sessions, first and last check-in, with small inline values.
- Benefits: gives context for dips; mirrors how a therapist narrates care.
- Limitations: mixes data types in one list, undermining the separation the brief asks for; the clinician `timeline` endpoint is not available to patients, so it must be assembled from plan versions, appointments and sessions, three separate reads; long.
- Accessibility: a list is fine.
- Business: neutral.
- Technical complexity: medium to high.
- Error and recovery: partial failure of one source gives an incomplete history that looks complete.
- Evidence: J only (no observed production equivalent for rehab progress).

Rejected before scoring: "line chart for everything". Weekly counts are small whole numbers per period and sessions are per-day events; lines imply continuity and interpolation between points that do not exist. Brief section 7 E says not to do this.

## 9. Mandatory gates

| Alternative | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| E1 | Pass | Pass | Pass (labels by data type, no verdicts, missing data shown) | Eligible |
| E2 | Pass only with a labelled grid and a list alternative | Pass | Conditional: "missed" marks must be neutral wording ("Not done") and never colour-only; a grid of unmarked missing days risks shaming but is not a hard safety failure | Eligible with conditions |
| E3 | Pass | Pass | Conditional: passes only if sentences are fixed templates of counts with no evaluative words; any generated or evaluative sentence fails AC-C7 | Eligible only as templated counts |
| E4 | Pass | Pass | Pass | Eligible |

## 10. Weighted evaluation

Weights adjusted: task 25, safety/privacy/trust 25 (the main risk here is misreading data), usability/accessibility 20, business 10, operations 10, technical 5, design system 5. Reason: the brief's central instruction for this feature is not to equate engagement with improvement, which is a trust issue; business value is weakest here because progress views drive few measurable outcomes.

| Criterion | E1 | E2 | E3 | E4 |
|---|---|---|---|---|
| Task effectiveness (25) | 4: each question has a matching form | 4: consistency obvious | 3: quick read, hides shape | 3: context but long |
| Safety, privacy, trust (25) | 5: separation by data type, gaps marked | 4: needs careful wording | 3: sentence interpretation risk | 4: no new risk |
| Usability, accessibility (20) | 4: familiar forms; strip is simple | 4: familiar, grid is costly to make accessible | 4 | 3: long mixed list |
| Business value (10) | 3 | 3 | 3 | 3 |
| Operations (10) | 4: same data for clinician and patient | 3 | 3 | 4 |
| Technical (5) | 5 | 4 | 4 | 2: three reads to assemble |
| Design system (5) | 5: existing charts | 3: new grid | 4 | 3 |
| Weighted total (out of 5) | 4.25 | 3.75 | 3.30 | 3.30 |

Arithmetic: E1 = (25x4 + 25x5 + 20x4 + 10x3 + 10x4 + 5x5 + 5x5) / 100 = 4.25. E2 = 3.75. E3 = 3.30. E4 = 3.30. Judgement scores, not measurements.

## 11. Recommendation

Select E1. Structure the screen by data type with the forms below, and keep all copy to counts and "patient-reported":

| Data | Category (label shown) | Form | Notes |
|---|---|---|---|
| Sessions done this week | Activity completion: "What you did" | Day strip for this week plus weekly bars | Mark current week "so far"; each day has text (done, rest, stopped, not done) |
| Completed versus assigned by week | Programme engagement: part of "What you did" | Grouped bars with direct labels (existing) | Not a progress claim; say "sessions", not "progress" |
| Pain at check-ins | Patient-reported outcome: "What you reported" | Time-scaled points with a line only across short gaps; table kept | Label "Patient-reported, 0 to 10"; show "No check-in" for gaps; no caption with evaluative words |
| Goals | Functional goals: "Goals from your care team" | List with target and due date | "Measured at your visits. Not tracked here." No bars or rings |
| Clinical assessments | none stored | not shown | Do not imply they exist |
| Session log | Detail | Disclosure or separate page | Moves below goals |

Why it beats the runner-up E2: it carries the same consistency information (the day strip) without a grid of "missed" days and at lower accessibility cost; E2's month view can be added later for patients who want it. Rejected: E3 (interpretation risk), E4 (mixes data types, three-read assembly), line charts for everything.

Trade-off: no one-number answer to "am I better?", on purpose. The honest answer in this product is "ask your therapist", and the screen should say where to do that (link to Messages and Appointments).

Open question for the advisor: approve plan-version markers on the pain chart? They help context but add visual elements; recommended as small ticks with text in the table.

## 12. Requirement alignment row

| Field | Value |
|---|---|
| User segment | Active patient, before or after a visit |
| Job to be done | See what I have done and what I told my care team, and know what is not measured |
| Pain point | Mixed data types read as one story; gaps hidden; long page; goals buried |
| Business objective | Informed visits; trust in the product's data |
| Functional requirement | REQ-PRG-01, REQ-PRG-02, AC-C2 (same counts as clinician), AC-C7 (labels, table for every chart, no "improve") |
| Success metric | Progress screen reach; table-toggle use; comprehension in testing (names only) |
| Design hypothesis | If each data type has its own labelled form and missing data is shown, patients can say what each chart means and do not read activity as recovery. [Untested] |
| Selected pattern | E1 sections by data type |
| Technical dependency | `GET /patients/:id/progress` as is; optional `weeks` up to 12 |
| Validation method | Comprehension test with synthetic scenarios ("Which of these shows what you did? Which is your own rating?"), screen-reader and table check, contrast check on marks, automated test that no caption contains evaluative words |

## 13. States to design

| State | Microcopy | Recovery or action |
|---|---|---|
| Default | "What you did", "What you reported", "Goals from your care team" | Table toggles |
| Loading | Skeleton per section, "Loading your progress" | None |
| Empty (no plan or no sessions) | "Nothing to show yet. Your sessions and check-in ratings appear here after you do your first session." | Link to Today |
| Partial data (no check-ins) | "No check-ins yet. Each check-in adds one point here." | Link to check in |
| Partial data (some weeks) | "Week of Nov 16 so far" | none |
| Gap in pain | "No check-in between Nov 4 and Nov 12." | none |
| Not enough data | "Two check-ins so far. More points make the line easier to read." Neutral, no verdict | none |
| Stopped-for-discomfort session | List row "Stopped for discomfort"; strip text "stopped" | Link to Contact care team |
| Server error | "Progress did not load. Try again." | Retry; header Contact stays |
| Network loss | "You are offline. Showing what was loaded at 9:12 AM." or error | Retry on reconnect |
| Stale information | "Updated 9:12 AM" | Refresh |
| Table open / closed | Button "Show pain ratings as a table" and "Hide table" with state announced | Toggle |
| Focus, hover, active | Chart points focusable only if they have tooltip content; otherwise data lives in the table | n/a |
| Permission denied | "You have been signed out." | Sign in |

## 14. Responsive behaviour

- 375, 390: single column; day strip wraps to seven equal cells; weekly bars show 4 weeks; pain chart full width with labelled points only when 8 or fewer; tables stack as scrollable regions with a visible caption; session log collapsed.
- 768: same single column; bars can show up to 8 weeks.
- 1024: two columns, "What you did" left and "What you reported" right; goals full width below; session log still collapsed.
- 1440: same as 1024 with larger charts; weeks selector (4, 8, 12) visible.
- 1920: centred with maximum width; do not stretch charts past a readable aspect ratio.
- What changes model: nothing; a month calendar (E2) could become an optional view at 1024 and above later.
