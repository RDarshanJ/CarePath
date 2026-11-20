# CarePath data visualization guidelines

Status: provisional until advisor sign-off. Derived from `component-research/05-clinical-data-presentation.md` (decisions CD-210 to CD-220) and `feature-research/E-progress.md`. Brief: `docs/COMPONENT-BRIEF.md` section 12. Colours are not chosen here: marks, legends and tones use semantic token roles only, and the palette comes from the chosen colour direction. Sources behind these rules are listed in the research file, including what could not be accessed.

## 1. Principles

1. Ask first: what question does it answer, who reads it, what decision follows? If one sentence answers it, write the sentence and skip the chart. Do not add a chart because a dashboard is expected to have one.
2. Show what the data is. Every number carries its source class (CD-210), unit or scale, and date.
3. Never show more than the data holds: no interpolation, smoothing, trend lines, projections, bands, targets or verdict words on patient-reported values (AC-C7). Activity is not recovery; engagement is not progress.
4. Absence is information. Missing data is drawn and worded, never blank, zero or joined across (CD-217).
5. Every chart has an equal text form: a one-sentence neutral summary and a real table with the same values (AC-C7, CD-218).
6. Same data, same numbers for patient and clinician (AC-C2): one shared component and one endpoint.

## 2. Which form for which question

| Question | Reader | Data | Form | Not this |
|---|---|---|---|---|
| What did the patient report, and when? | both | integer 0 to 10 at check-ins | Time-scaled points with a line only across gaps of 7 days or less; table | Heatmap ramp, sparkline, smoothed line, target line |
| How many sessions against what was scheduled, per week? | both | whole counts per week | Grouped bars (assigned outline, completed solid), values printed; current week marked "so far"; table | Donut, progress ring, percentage, streak |
| What happened each day this week? | patient mainly | per-day status | Ordered list of seven days with a word and icon | Month grid of unmarked missed days |
| Where is the patient against a goal? | both | target only, no current value | Goal list with target, unit, due date and "Measured at your visits. Not tracked here." | Progress bar, ring, "on track" |
| What was the last value and how recent? (in a list row) | clinician | latest value, date, count | Plain text line (CD-215) | Sparkline, colour-coded score |
| Position in a process | patient | step n of m | `Progress` bar with text "Step 3 of 11" | Using it for achievement |
| Exact values to read or compare | clinician | any | Table (sortable only where comparison needs it) | Chart that hides values |
| What changed since the last visit | clinician | mixed events | Timeline (see `design-alternatives/prototypes/longitudinal-history.md`) | One chart mixing data classes |

Lines are for continuous series and only where consecutive observations are close enough to connect. Bars are for per-period counts. Whole-number counts never use area or smoothing. Pie, donut, stacked, area and scatter charts are not used for any current CarePath question; reopen this table before adding one.

## 3. Scales, axes and precision

- Pain axis: fixed 0 to 10, integer ticks at 0, 5 and 10, never autoscaled or truncated. Bar axes start at zero.
- Counts: integers, no decimals, no rounding to percentages.
- Time axes: scaled by real dates; label at least the first and last date and every directly labelled point; weeks start on Monday (contract `weekStart`) and the label is a date range.
- Units beside every number: "7 of 10", "3 sessions", "12 min". Say "of 10" not "out of 10".
- Dates: month as a word ("Nov 19"), year when not the current year, in the organization time zone with the time zone named once per screen (matrix G3 lists three conventions today; one is needed).
- Windows: patient default 4 weeks, clinician up to 12 (contract limit); the window is always stated in the title or caption.

## 4. Marks, legend, labels

- Direct labels on points and bars; a legend only for series that need one, in the same position on every chart (Carbon dashboards guidance, observed).
- Series are distinguished by shape, fill pattern and label, never colour alone. Assigned versus completed: outline versus solid. Patient-reported versus clinician-assessed (when it exists): different shape (hollow circle versus filled square), separate lane, separate legend entry with the word.
- Marks need at least 3:1 contrast against their background (SC 1.4.11); labels 4.5:1 (SC 1.4.3). Test in forced-colours mode: marks must remain distinguishable.
- One colour per data class across the product (Carbon, observed); no value-based colour on health values (no green-good, red-bad on pain, no gradients).
- No tooltips as the only way to read a value; hover is not an access path on touch or keyboard.
- No animation that communicates data; reduced motion shows the final state.
- Charts do not carry decoration: no gradients, shadows, 3D, sparkle icons.

## 5. Missing, partial and stale data

See the state table in research file section 9. Summary: "No check-ins yet" (never ever), break plus text for a gap, "so far this week" for a partial week, per-section error with retry, "Check-in data is 3 hours old" with Refresh for stale, "Not recorded" for a field the product does not hold. Never a dash, "?" or a zero that is not a count.

## 6. Accessible alternatives

- Structure: `figure` containing the chart (`role="img"`, short `aria-label` naming the chart and pointing to the detail) and a `figcaption` with a neutral sentence of counts; the table follows in the main content (patient: behind a labelled toggle that remains in the DOM; clinician: visible). W3C guidance on complex images, observed, says the long description should be available to everyone and that `aria-describedby` flattens tables.
- Caption words are counts and dates only: "Pain ratings from Oct 27 to Nov 19: 9 check-ins, lowest 3, highest 7." An automated test rejects improve, improved, better, worse, recover, progress, on track, good, bad.
- The table is real `Table` markup with caption and `th scope`, same rows as the chart, same number format.
- Keyboard: toggle buttons are native buttons; a chart that gains interaction must meet the APG pattern before shipping (not planned).
- Touch targets 24 px minimum for any interactive control around a chart (SC 2.5.8), 44 px or the patient-theme size in the patient app.

## 7. Clinical-specific rules

- Patient-reported pain is labelled "Patient-reported" on the chart title, the table caption and the list line. Clinician-assessed values, when stored, are labelled "Clinician-assessed" and never share a series with patient-reported ones; a shared axis only for the same instrument and unit.
- Activity completion is shown as counts of sessions and never as a score, percentage, streak or rating of the patient.
- Plan-version changes may be marked as small ticks with text; they annotate, they do not explain a change in values.
- No prediction, no benchmark, no "normal range", no population comparison, no risk score.
- Stopped-for-discomfort is shown as a count and a text label, not a colour segment.
- AI-generated summaries are not chart captions; any generated text is labelled per CD-236 and is not part of the chart's accessible description.

## 8. Implementation and testing

- One `ui`-level or shared chart package for `WeeklyBars`, `PainLine`, `BarsLegend`, `TableToggle` and `ObservationValue`, used by patient and clinician; business wording stays in the app layer.
- Tests: chart-to-table equality (patient and clinician read the same rows, AC-C2); gap rule unit tests (7-day threshold, single point, empty, one very long gap); banned-words test on captions; axe at 375, 768, 1440; forced-colours screenshot; 200 percent text; screen-reader pass of a figure with its table.
- Validation to run (not run): comprehension with synthetic scenarios ("Which shows what you did? Which is your own rating? What is not measured here?"); do not claim participant results until real sessions happen.
