# D-WP-6 before and after

Captured with `CAPTURE_DIR=docs/design/after/d-wp-6 scripts/with-web-lock.sh scripts/design-capture.sh wpd6 4106 3106`
(the same command `scripts/gate-wp-d6.sh` runs into scratch), same seed anchor, fixed clock and file names as
`docs/design/baseline/`, `../d-wp-1/` (tokens only) and `../d-wp-2/` (components). D-WP-6 changes the shells,
the navigation and the sign-in page; page content is unchanged, so compare the top and bottom of each screen.
Every file name exists at 375, 390, 768, 1024, 1440 and 1920. Recorded after rebasing onto `main` with D-WP-5, WP 6.1 and WP 6.3 (the small seed's content hash changed with WP 6.3's NPIs).

| After file | What changed in D-WP-6 | Audit finding or decision | Status |
|---|---|---|---|
| `public-sign-in-*`, `public-sign-in-errors-*`, `public-landing-*` | The form is a white panel and the page's one filled button; the demo chooser is a level-2 section after it with one compact list, no emails; below 1024 a link at the top says "Exploring the demo? Choose a role"; "Create your account" links to onboarding; one skip link | audit 2 "sign-in demo chooser with equal weight", "demo-account chooser visually primary"; CD-507 | fixed |
| every `patient-*` screen in the app | Header: brand, "Signed in as {name}" with Sign out, Contact care team top right; tab row from 768; ui `BottomTabBar` below 768 (sticky in the flow, 64 px, badge read after the label); "Appointments" breaks after "Appoint" at 375 instead of clipping; footer link at the 48 px target | CD-500, CD-205, CD-508; audit 2 navigation (patient) | fixed |
| `patient-session-intro-*`, `patient-session-player-*`, `patient-session-paused-*`, `patient-discomfort-*` | Focus layout: "Back to Today" back link (CD-505), Contact care team, no navigation, no identity line | CD-505, CD-205 (omitted in the session) | fixed |
| `patient-onboarding-*` | The skip link and demo notice now come from the patient group layout, so onboarding has one of each | CD-507 (no skip link on onboarding) | fixed |
| every `clinician-*` screen | One banner: from 768 the 240 px sidebar (brand, organisation, Clinician navigation, identity with avatar, Sign out); below 768 a short top bar (brand, organisation, name, role, Sign out) and a labelled bottom bar. Order Overview, Schedule, Patients, Review queue, Messages; Review queue shows the API's open-task total, Messages the unread total | audit 2 and 3 "sidebar stacks above content, about 280 px at 390" (`clinician-overview-390`, `clinician-schedule-390`): the page title now starts at about 165 px; CD-501 as amended by DR-002 H; CD-508 | fixed |
| `clinician-schedule-375/390/768`, `clinician-record-appointments-375/390/768` | No horizontal overflow (baseline 245 to 260 px and 100 to 253 px). The table scrolls inside its own box: the shell's `main` cannot grow past the viewport, and the ui `Table` scroll box now contains its visually hidden header text | audit 4 overflow | fixed for the page; the tables still scroll sideways at 375 and 390, which is D-WP-14 and D-WP-15 layout work |
| `admin-home-*`, `admin-patients-*`, `admin-assign-dialog-*` | No sidebar for one destination: a banner with brand, "Administration", organisation, avatar, name, role and Sign out; no navigation landmark; content up to 1280 px wide | CD-502; audit 3 admin "one-item sidebar"; audit 4 admin overflow 401, 386 and 248 px at 375, 390, 768: now 0 | fixed |
| every screen | The demo notice is rendered inside each route group in that group's theme (12 px in the clinician and admin themes), on `surface-sunken` | audit 2 "demo banner is tan" (colour fixed in D-WP-1; type and placement here) | fixed |
| `design-system-*`, `design-system-healthcare-*` | Unchanged galleries (D-WP-2, D-WP-5), captured by the same tool | none | n/a |

Probe on this set (`_probe.json`, checked by `scripts/gate-wp-d6-probe.mjs`): no warm background outside status
and chart tokens; horizontal overflow on 0 of 278 images (baseline and D-WP-2: 15); no axe serious or critical
finding at 375, 768 or 1440 (axe runs with sticky bottom bars in the page flow, see `docs/PROGRESS.md` D-WP-6).
127 images still list a page-content target under the theme floor (for example inline links in clinician
tables); the shell's own controls are measured by `e2e/shells.spec.ts` and none is under the floor. The probe
also lists the visually hidden skip link and Radix's 1 px native select, which are not targets a person hits.

Visual passes. Pass 1 (own captures against CD-500 to CD-508 and CD-205): fixed the footer "Sharing and consent"
link (19 px tall), the duplicated identity markup in the staff banner, the clipped "Appointments" label at 375,
and the patient header height on phones. Pass 2 (fresh capture above, reviewed against `audit.md` sections 2 to
4 for shell findings): each row's status column. Not reviewed by the advisor; that is checkpoint D2.
