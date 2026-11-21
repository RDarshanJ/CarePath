# D-WP-10 before and after

Captured with `CAPTURE_DIR=docs/design/after/d-wp-10 PROBE_FAIL_ON=warm,overflow,axe,targets,pictures SCREENS="patient-today-session-persona,patient-session-,patient-discomfort-,patient-check-in" scripts/with-web-lock.sh scripts/design-capture.sh wpd10 4110 3110`
(the command `scripts/gate-wp-d10.sh` runs into scratch), on `wp/d10` rebased onto `main` at `04f6002` (D-WP-U merged), same seed
anchor, fixed clock and file names as `docs/design/baseline/`. 13 screens at 375, 390, 768, 1024, 1440 and 1920 (78 images).
`pairs/` holds side-by-side images (baseline left, D-WP-10 right) at the phone width the baseline has for each screen.

The session chain runs on `patient.flare` (overview, player, paused, stop sheet, stop sheet with a number, stopped). The new
phases run on `patient.demo` and have no baseline: `patient-session-rest-*`, `-next-*`, `-skip-*`, `-finish-*`, `-complete-*`.
The capture taps "Pause rest" before the rest and next captures so all six widths show the same clock.

| After file | What changed in D-WP-10 | Decision | Pair |
|---|---|---|---|
| `patient-session-player-*` | Full-screen phase player (C2). Order at 390: exercise name, dose ("Set 1 of 3" at 40 px, the per-set line, a set track, rest), hold timer, then the control bar (full-width 56 px primary, neutral Pause and Skip, critical-tone "Stop, this hurts"), then "Get ready" on the first exercise, the picture (own picture only), the therapist note, the steps, up next and the list. The bar is sticky to the top and bottom of the window. From 768 the information and the bar are one sticky column beside the picture and steps. Baseline: the primary sat about 1,100 px down at 390, below the picture and the steps | DR-002 C, DR-004 5.2, CD-421, CD-424, U9 | `pairs/patient-session-player-390.png`, `-375.png` |
| `patient-session-rest-*` | Rest is its own phase: the exercise name small, "Rest" as the heading, the countdown (`role="timer"`, not live) with a decorative draining bar, "Next: set 2 of 2" and the per-set line; primary "Skip rest", neutral "Pause rest" and "Add 15 seconds", Stop | CD-126, feature C 13 | new |
| `patient-session-next-*` | Between exercises: "Pelvic tilt done. Next exercise", the next name and full dose, a rest countdown with Pause rest and Add 15 seconds, primary "Start exercise 2", Pause, Skip, Stop; the next picture and note beside | feature C, C2 phases | new |
| `patient-session-skip-*` | Skip sheet with a reason; choosing "It hurts" shows "Do you want to stop the session instead?" with a critical-tone "Stop the session instead" | feature C item 7 | new |
| `patient-session-finish-*` | "All exercises done" with the bar: primary "Finish session", Pause, Stop | C2 | new |
| `patient-session-complete-*` | "Session complete" with the counts, then the check-in: pain scale with anchors and the live line, optional difficulty and note, and a pinned send bar with the emergency line and "Your therapist will see this" | DR-002 D, feature D items 2 and 4 | new |
| `patient-session-paused-*` | "Session paused", place named by exercise, the bar with primary "Resume session", neutral "Back to Today" and Stop (Stop is reachable while paused) | C2, CD-421 | `pairs/patient-session-paused-390.png` |
| `patient-session-intro-*` | "Begin session" moved above the list so it is on the first screen at 375 by 667; the stop sentence says Stop ends the session at once; numbered list without the cobalt tint; pictures only for exercises with their own picture (text first otherwise); the content notice at the end | DR-004 5.2 and U9, R4 (no total time) | `pairs/patient-session-intro-375.png` |
| `patient-discomfort-confirm-*` | One sheet: "Stop this session?", an optional pain scale ("Optional. You can stop without choosing, and tell us on the next screen.") and an optional note; "Stop session" works with no number (CR-6). Baseline: the same sheet refused to stop without a number | CR-6, CD-421, DR-002 C | `pairs/patient-discomfort-confirm-390.png` |
| `patient-discomfort-pain-sheet-*` | The same sheet with 8 chosen ("You chose 8 of 10.", check mark and fill, no band word) and a note | CD-100, CD-101 | `pairs/patient-discomfort-pain-sheet-390.png` |
| `patient-discomfort-stopped-*` | "Session stopped" with one contact notice (clinic name as the title, "You reported pain of 8 out of 10. If you are worried, contact your clinic at ..." and the emergency line), then "Report your pain" with 8 preselected and "You told us 8 when you stopped."; the form shows no second notice before or after sending. Baseline: the notice appeared above and again below the check-in | feature D item 3, DR-002 D | `pairs/patient-discomfort-stopped-390.png` |
| `patient-check-in-*` | Daily check-in: the emergency line before sending, the send bar pinned above the tab bar below 768, "Your therapist will see this" beside Send | feature D items 2 and 4 | `pairs/patient-check-in-390.png` |
| `patient-today-session-persona-*` | Unchanged by this package (Today is D-WP-9); captured as the start of the chain | none | `pairs/patient-today-session-persona-390.png` |

Probe on this set (`_probe.json`): warm backgrounds outside status and chart tokens 0; horizontal overflow 0 of 78; axe
serious or critical 0 (375, 768, 1440); real targets under the 48 px patient floor 0; body-area pictures wider than 64 px 0.
The six warm images are the warning notice on the stopped screen (a status token).

Visual pass 1 (development screenshots at 390 and 1440 from `session-player.spec`, against DR-004 5.1 and 5.2, CD-421,
feature D section 13): the stopped notice repeated "If you are worried" in its title and its sentence (title is now the
clinic name); the stopped intro was three clauses long (shortened); "One number is enough. Your therapist will see it."
repeated the line beside Send (now "One number is enough.").

Visual pass 2 (this capture at all six widths): on `/check-in` below 768 the pinned send bar sat under the patient tab
bar (now sticks above it, and a spec checks the two bars do not overlap at 375 by 667); after a stop the hint "Change it
if it is different now." came before "You told us 8 when you stopped." (the hint moved into the intro). Seen and not this
package's: in the focus shell from 768 "Contact care team" sits beside "Back to Today" instead of at the right edge
(`patient-frame.tsx`, D-WP-6 and D-WP-U); recorded for D3.

Reduced motion: every capture runs with `prefers-reduced-motion: reduce`; `session-player.spec` also asserts the rest bar
has no transition under it. Keyboard: `session-player.spec` walks the whole session and the check-in by keyboard at 375
by 667 and asserts no focused control intersects a sticky bar; a second test does the same on `/check-in` with the tab bar.
