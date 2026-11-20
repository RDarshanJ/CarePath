# DR-003: Which prototype comparisons to build

Date: 2026-11-20. Decider: lead advisor. Status: decided.
Brief: `docs/COMPONENT-BRIEF.md` section 20. Specs: `design-alternatives/prototypes/*.md` (nine specs, none built).

## 1. Test applied

A comparison is built only if rendering it could change the decision. A prototype that can only confirm a choice already fixed by a gate, a contract or an earlier ruling is not built; its spec stays as the record that alternatives were considered. With no participants available, a rendered comparison yields a heuristic walkthrough, a keyboard count and an axe run. That is enough to settle a layout question and not enough to overturn a safety rule.

## 2. Result

**Build one comparison: longitudinal history. Decide the other five on the evidence already written.** One further screen is rendered as a check, not as a comparison.

| Comparison | Build? | Decided as | Why |
|---|---|---|---|
| Pain input (P1 radio scale, P2 slider, P3 stepper) | No | P1, CD-100 | P2 exists only to test the project rule against sliders for a precise clinical value, and no walkthrough without patients can overturn that rule. P3 costs up to ten taps to reach a high number for someone in pain. P1 is already in production in four places. The real risk, the uneven two-row wrap at 390 px seen in the audit, is a layout defect fixed and checked in the slice's own visual passes (rows 0 to 5 and 6 to 10). |
| Clinician directory (table, master-detail, stacked list) | No | Table, CD-330 | Master-detail shows more of a record from a list, which DR-002 just ruled out with the peek. The stacked list is already the table's form below 768 px (CD-339), so it gets built and seen anyway. The spec's own decision rule keeps the table unless another layout wins timed tasks, which needs participants. |
| Plan editing (wizard, single page, split pane) | No | Split pane, CD-300 to CD-306 | The wizard fails on a contract fact: the draft endpoint needs a valid whole plan, so step-by-step saving has nowhere to go. The single page is the split pane's own layout below 1280 px, so both ship and both are captured at 1024 and 1440. |
| AI evidence review (drawer, docked source pane) | No comparison; one render check | Drawer for structured records, side-by-side for the transcript draft only, CD-400 | Under DR-002 rule R6 the evidence pane is already in place and non-modal from 1280 px, so the two approaches differ only in "open on demand" against "always open", and the sources are short structured records. What is unproven is DR-001's graphite treatment on a real screen. That is checked on the real WP 5.3 screen at its first gate, using the fixture in `ai-evidence-review.md` section 2 as seed data. |
| Appointment availability (lists, calendars) | No | Lists for all three roles, CD-310, CD-312, CD-313 | C2 ruled out a calendar grid and drag. The calendar approach needs three new components with heavy keyboard models and a list alternative for each, and no write API exists yet to manage availability in any form. |
| Longitudinal history (unified timeline, time-aligned lanes) | **Yes** | Pending, CD-241 | The only one where the record says "pending" for a real reason: both pass every gate, both use the same data and the same components, and the answer sets the default section of the most-used clinician screen. Reading cannot settle whether lanes make "before or after the plan change" easier to see. |

The three smaller specs (`messages-composer-urgent-route`, `overlay-queue-note`, `record-context-navigation`) are also not built; CD-511, CD-523 and CD-503 are accepted in DR-002.

## 3. The one build: longitudinal history

- **Spec:** `design-alternatives/prototypes/longitudinal-history.md`, unchanged.
- **Where:** `apps/web/app/(public)/design-system/prototypes/longitudinal-history/` with a fixture file beside it. It is reachable only under the gallery route, is excluded from navigation, and is deleted when CD-241 is closed (brief section 20: exploration stays out of the product).
- **With:** the final tokens (after D-WP-1) and the real `PatientBanner`, summary, `ObservationValue`, status maps, table and chart components (after D-WP-5). Nothing is styled specially for the prototype.
- **Views:** approach A and approach B, each at 1440 by 900 and 390 by 844, plus B's table fallback.
- **Evaluation:** the five scripted tasks in the spec, done by the advisor: interactions per task, whether what is unknown (gaps, not collected) can be stated, keyboard-only pass, axe. Results are reported as one reviewer's walkthrough, not as research.
- **Decision rule, fixed now:** approach A (the unified timeline, "since last visit" by default) is the default section. Approach B is added as a "Trends" view inside "Check-ins and activity" only if it answers tasks 2 and 3 in fewer interactions than A and its table fallback passes the keyboard pass. If B does not clear that bar it is not built in production at all.
- **Cost cap:** one sonnet work package (D-WP-P in `rebuild-plan.md`), one gate. It runs beside the patient slices and must close before the record slice (D-WP-15) starts.

## 4. The one render check: AI review

Not a comparison. At the first gate of WP 5.3 the real review panel is seeded with the eight statements, seven sources and two missing-information items from `ai-evidence-review.md`, captured at 1440, 1024 and 390, and reviewed for one question from DR-001: does the graphite draft block read as "not yet mine" and not as "disabled". If it reads as disabled, the fix is in `ai-ink` weight and the label, not in a new hue, and DR-001 is amended.

## 5. What this record does not claim

No prototype result exists yet. No participant has seen any alternative. The five decisions made without a build rest on gates, contract facts and earlier rulings, and each stays open to a later test with real users.
