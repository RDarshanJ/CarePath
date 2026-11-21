# D-WP-8 before and after (onboarding and consent)

Set recorded by `scripts/design-capture.sh` (API 4108, web 3108, fixed clock 2026-11-19T16:00Z, small seed) on `wp/d8` rebased onto D-WP-U (`04f6002`). Six widths each: 375, 390, 768, 1024, 1440, 1920. Probe with `PROBE_FAIL_ON=warm,overflow,axe,targets,pictures`: no overflow, no warm background, no axe serious or critical finding (375, 768, 1440), no target under the theme floor, no body-area picture wider than 64 px.

The first two onboarding files keep the baseline names, but their content changed because the order changed (code and date of birth first), so they pair by position.

| File | Before | After | Finding addressed |
|---|---|---|---|
| `patient-onboarding-1-account-*` | Account form first | Step 1: length and stop point stated, eligibility code, three-field date of birth | A item 2 (code checked last), item 6 (browser date control), item 3 (no up-front promise) |
| `patient-onboarding-1-account-errors-*` | Error summary on the account form | Error summary on step 1 | Linked, announced errors kept |
| `patient-onboarding-2-code-*` | Code and native date input | Step 2: account, with the memory-only note | A item 1 (kept in memory per DR-002 A) |
| `patient-onboarding-resume-step-*` | Lands on the pain step | Pain step after the summary and Continue | Resume refinement |
| `patient-consent-*` | Switch, "Not available yet" camera block | Explicit Allow or Stop allowing, state lines, result line, history with wording version, no camera block | CD-140, CD-144, C3 item 5 |

New files without a baseline: `patient-onboarding-resume-summary`, `patient-onboarding-s03-about` to `s12-done` (every step), `s06-pain-errors`, `s10-consent-errors`, `patient-consent-not-allowed`, `patient-consent-allowed`.

## Pass 1 (own review against CD-102, 105 to 109, 140 to 145, DR-004 5.1)

- Fixed: the wording version "2026-11-01" broke across two lines on step 10; it is kept whole.
- Header Sign in link meets the 48 px target (probe: no target under the floor).
- Checked and kept: one filled button per step, Back neutral, no secondary button; no panel inside a panel; error summary items 8 px apart; pain scales show the anchors and no band word.

## Pass 2 (fresh set, same checks)

- Open: at 375 and 390 the year box of the date of birth wraps under day and month (the field is in `packages/ui`). A request for D-WP-U to fit the three parts on one row at 390.
- Sharing and consent for patient.noai shows "The wording changed": the seeded required consent names version `2026-11` while the current text version is `2026-11-01`. It is the CD-145 banner working on a seed quirk.
- Every step, the resume summary, review and done read as one 32rem column on a white panel at 1440; nothing else open.

No participant saw any of this. Both passes are the worker's own review, not the advisor's.
