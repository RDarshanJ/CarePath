# D-WP-2 before and after

Captured by `scripts/gate-wp-d2.sh` with `CAPTURE_DIR=docs/design/after/d-wp-2` (same seed anchor, fixed
clock and file names as `docs/design/baseline/` and `docs/design/after/d-wp-1/`). The gallery images were
re-captured after the last gallery fix with `SCREENS=design-system` and merged into `_probe.json`.
D-WP-2 changes components, not layouts, so the screen pairs show component-level differences only;
compare each file with the same name in `../d-wp-1/` (tokens only) and `../../baseline/`.

| After file (all six widths) | What changed in D-WP-2 | Finding or decision |
|---|---|---|
| `design-system-*.png`, `design-system-reduced-motion-1440.png`, `design-system-zoom-200-1280.png` | New gallery: every D-WP-2 component with its states; nothing animates under reduced motion (probe count 0); no horizontal overflow at 200 percent zoom of 1280 | Rebuild plan D-WP-2 gate additions |
| `patient-booking-*`, `patient-reschedule-*` | Day and time-of-day filters are `ToggleChip` (fill plus check mark); times are `SlotButton`; "Show later days" is `LoadMore` | Matrix A3 and H (chips, five class sets); CD-311, CD-335 |
| `patient-today-*`, `patient-appointments-*`, `patient-session-*` | Button-styled links and text links are the ui `Button href` and `Link variant="standalone"` (48 px target) | Matrix A2, B (three link implementations); CD-530, CD-121 |
| `patient-session-player-*` | "Stop, this hurts" uses `tone="critical"` (outline, error ink, alert icon) | Matrix G1; CD-421 |
| `patient-today-*` (plan change note), `patient-plan-*` | Plan change card is the info `Banner` with its acknowledge action | Matrix A3 (hand-built banner); CD-535 |
| `patient-onboarding-1-account-errors-*` | Error summary is the ui `ErrorSummary`; the title gets "Error:" | Matrix A3; CD-441 |
| every patient screen with the tab bar | Unread count is the one filled `CountBadge` | Matrix A3, B (two badges); CD-508 |
| `clinician-review-queue-*`, `clinician-record-*`, `clinician-overview-*`, `clinician-inbox-*`, `clinician-schedule-*` | Header rows are `Tr header`; empty states are `EmptyState padded`; "Show more ..." is `LoadMore`; selected row uses `selected-bg` and the edge bar; hover only on clickable rows; secondary buttons are the cobalt outline | Matrix A3, H; CD-338, CD-335, CD-535; design-tokens section 3 |
| `clinician-*` side nav | Current item: `selected-bg`, `selected-ink`, edge bar; badge is the filled `CountBadge` | design-tokens section 3; CD-508 |

Probe on this set: no warm background outside status and chart tokens; horizontal overflow on the same
15 images as D-WP-1 (admin patients, clinician schedule and record appointments at 375, 390 and 768:
layout work for D-WP-6, D-WP-14, D-WP-15, WP 6.2); axe serious finding `target-size` on
`patient-reschedule-375` (3 nodes, was 4 in D-WP-1), left for D-WP-11. The gallery has no axe serious or
critical finding at 375, 768 or 1440.
