# D-WP-5 before and after

Captured by `scripts/design-capture.sh` with `CAPTURE_DIR=docs/design/after/d-wp-5`,
`SCREENS=design-system-healthcare` and `PROBE_FAIL_ON=warm,overflow,axe` (the same command
`scripts/gate-wp-d5.sh` runs into scratch), same seed anchor and fixed clock as `docs/design/baseline/`.

D-WP-5 builds the healthcare kit in `packages/ui`; no app screen uses it yet. The "after" images are
therefore the five gallery pages, and the "before" column names the baseline screens whose hand-built
versions the kit replaces when the screen slices adopt it. Those slices make the screen pairs with
the baseline file names.

| After file (six widths each) | Components shown | Before (baseline) | Finding or decision addressed |
|---|---|---|---|
| `design-system-healthcare-records-*` | `PatientBanner` (full, compact below 1024, born line in details below 768, missing data, offline, loading), `PatientRowIdentity`, `AppointmentRecord` (row and summary, both audiences, every status), `ConsentStatusLine`, `ConsentSummary` | `clinician-record-*` (identity in the sticky page header with actions, gender and language not shown, name in the document title), `clinician-review-queue-*`, `clinician-schedule-*`, `patient-appointments-*`, `patient-consent-*` | CD-200 to CD-204, CD-317, CD-140, CD-144, CD-146; R2 (no name in titles); C3 item 5 (motion tracking not shown) |
| `design-system-healthcare-data-*` | `PainChart` with the 7-day gap rule and plan ticks for staff, `WeeklySessionsChart` with the partial week, `ChartFigure` (caption plus equal table, toggle for patients, visible for clinicians), `DayStrip`, empty, single point, error, loading and stale states, list-row summary | `patient-progress-*` (charts about 290 px wide in a 600 px column, data shown twice, tables behind toggles while a sessions table repeats them), `clinician-record-activity-*` (tables and sentences only) | Audit `patient-progress` note; CD-210 to CD-218; DR-002 E (no tick on the patient chart) |
| `design-system-healthcare-planning-*` | `ExerciseSummary` (library with in-plan state, patient plan, session overview, long name, no picture), `DoseEditorRow` with `MoveButtons`, `PlanDiff` for both audiences, `VersionList`, `PlanStateLine` (all states) | `clinician-plan-builder-*` (six numeric fields, seven checkboxes and a textarea always open per exercise, about 1,100 px for four exercises), `patient-plan-*`, `patient-today-*` (plan change note) | Audit `clinician-plan-builder` note; CD-300 to CD-305; DR-002 K vocabulary |
| `design-system-healthcare-messaging-*` | `MessageThread` (patient and staff), `MessageComposer` (patient with starting points and the notices, staff with the reply-time hint and shortcut), `DeliveryState`, `EmergencyNotice` with `URGENT_NOTICE` | `patient-message-thread-*`, `clinician-inbox-thread-*` (two implementations, staff composer repeating the patient emergency line) | CD-510 to CD-513; DR-002 G (staff composer has no emergency notice, drafts memory only) |
| `design-system-healthcare-ai-*` | `AIDraftBlock` in six states plus a missing provider, `ProvenanceLine`, `EvidenceRef` ("opened"), `StatementSupport` ("Edited, not re-checked"), `ReviewDecisionBar` (blocked with reasons and links, allowed with edits, offline, consent withdrawn with a save error, not on the care team) | the old `/design-system` AI draft specimen in `../d-wp-2/design-system-*` (three states, strike-through on rejected text, approve and discard buttons); no app screen yet (WP 5.3) | CD-236, CD-404 to CD-407; DR-002 M as amended by checkpoint C3 3.1 (no "AI" in output labels, `DEMO_PROVIDER_NOTICE` on every demo block) |

Probe on this set: no warm background outside status and chart tokens; no horizontal overflow at any
width; no axe serious or critical finding at 375, 768 or 1440. Targets under 24 px: the visually hidden
skip link (focusable, shown on focus) and the phone numbers inside the emergency sentence, which are
inline links in a sentence (WCAG 2.5.8 inline exception). The phone links are also under the 48 px
patient floor for the same reason.
