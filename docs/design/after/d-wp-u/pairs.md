# D-WP-U before and after

Captured by `scripts/gate-wp-du.sh` (the same `scripts/design-capture.sh wpdu 4120 3120` run, copied here from its
scratch directory), same seed anchor, fixed clock and file names as `docs/design/baseline/` and `../d-wp-6/`.
D-WP-U is the DR-004 section 4 batch: it changes the kit, the shells and sign-in, not page layout, so compare each
file with the same name in `../d-wp-6/`. Every file name exists at 375, 390, 768, 1024, 1440 and 1920. Recorded on
`wp/du` rebased onto `main` with D-WP-4.

| After file | What changed in D-WP-U | DR-004 item | Status |
|---|---|---|---|
| every `clinician-*` at 1024, 1440, 1920 | The sidebar spans the window beside the demo notice: a short page is exactly the window tall (was 929 px in a 900 px window) and Sign out is fully visible on load | U1 | fixed |
| every `clinician-*` at 768 | No sidebar: short top bar, full-width main (768 px), labelled bottom bar; the review queue shows its four columns | U2 | fixed |
| `clinician-*-1920`, `admin-*-1920` | Content stops at 1440 px and stays left-aligned (clinician main 1440 px beside the 240 px sidebar; admin header and main at 1440 px from the left edge, was centred at 1280) | U2 | fixed |
| `patient-booking-*`, `patient-reschedule-*` | Time slots neutral at rest (grey control border, ink); the chosen slot keeps the selected fill, edge and check; Show later days neutral | U3 | fixed |
| every `patient-*` in the app | Contact care team is a neutral button in the header | U3 | fixed |
| `clinician-overview-*`, `clinician-plan-builder-*`, `clinician-schedule-*`, `clinician-review-queue-*` (detail), `admin-patients-*` | Mark reviewed, Refresh, Add, Assign, day navigation, pagination, move up and down, retry: neutral. Clear filters: quiet | U3 (5.1 rule 1), mechanical | fixed in the call sites; page composition is the slices' |
| `design-system-*`, `design-system-healthcare-*` | No cobalt outline left in the kit except the specimens of the `secondary` variant itself and the dialog safe choice; library Add, Retry sending, Reject draft and LoadMore neutral | U3 | fixed |
| every `patient-*` and `clinician-*` below 1024 | Bottom bar labels in `nav-label` 13/16, weight 500; "Appointments" on one line at 375; the badge starts at the icon's right edge, above its top, so the Messages and Review queue icons are whole; bar 64 px | U4 | fixed |
| every screen with a table or list link | Text links carry 4 px vertical padding (25 px hit height at 13 px, no layout change); links and name buttons in a table cell are at least 24 px; the 36 px row is unchanged | U5 | fixed |
| every screen with a checkbox, radio or switch | The label is the hit area, at least the theme target tall, with the box centred on its first line (patient rows 48 px; spacing within a few pixels of before) | U5, U6 | fixed |
| `_probe.json` | Real targets under the theme floor: 0 (D-WP-6 set: 277 images listed some). Not counted: hidden skip link, 1 px native select, Radix's bare form input, links inside a sentence (WCAG 2.5.8 inline exception, counted). Reported, not failed: the onboarding header "Sign in" link (D-WP-8) | U6 | fixed; one item owned by D-WP-8 |
| `design-system-healthcare-ai-*` | Provider line and demo notice at the small size, weight 400, ink-muted; the state label stays 600; "No supporting record" | U7, U8 | fixed |
| `patient-session-intro-*`, `patient-plan-*`, `patient-session-player-*`, `clinician-record-plan-*` | An exercise without its own picture (Shoulder blade squeeze) has no picture and reads text first; no `area-*` file wider than 64 px in any capture (the onboarding body-area picture is a 64 px tile) | U9 | fixed |
| `public-sign-in-*` | Demo chooser rows in ink weight 500 with a muted chevron; the form panel stops at 26rem; Sign in is the only cobalt-filled control and the chooser has no cobalt text | U10 | fixed; "Create your account" stays a cobalt text link |

Visual passes. Pass 1 (development captures, against DR-004 section 4): found the empty notifications region
lying over the staff bottom bar below 1024 px (it took clicks; fixed in the kit), the patient checkbox and switch
rows measuring 26 px through their labels (fixed by making the label the target), and the onboarding body-area
picture shown at 320 px (now a 64 px tile). Pass 2 (this recorded set, pairs above against `../d-wp-6/`): found
the session intro still drawing the shoulder area picture, because the seed stores area files as `mediaPath`;
fixed in `exerciseIllustration` before this set was recorded. Open after pass 2: at 1440 the sign-in page leaves
a wide gap between the 26rem panel and the chooser (the 12-column split is unchanged); at 1024 "Why it appeared"
still truncates in the queue table (D-WP-13). Not reviewed by the advisor.
