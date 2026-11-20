# Demo accounts

Synthetic data only. Not for clinical use. Every name, email, phone number and record in the seed is fictional. Emails use the reserved `.test` domain, MRNs start with `SYN-`, and organization names end with "(synthetic)".

All seeded logins share one password:

```
CarePath-Demo-2026
```

The password is stored as a scrypt hash in the format of `packages/shared/src/password.ts`. The seed uses a fixed salt so the database content is reproducible; accounts created through the API get a random salt. The password is for the local demonstration only.

Load the accounts with `pnpm db:seed` (small profile). The command replaces all tenant data in the local database, so it also resets any changes you made while demonstrating. The seeded world is fixed at 2026-11-19 16:00 UTC (the anchor date). History sits before that instant and bookings after it, whatever the real date is.

For a hand demo on another day, run `pnpm db:seed --anchor now`: the seeded "now" becomes the current hour (rounded down), so "due today" and "tomorrow" match the real clock. Automated tests keep the fixed anchor and start the API with `CAREPATH_FIXED_NOW` set to the same instant (checkpoint C1, ruling 3.8); that variable is ignored when `NODE_ENV=production`.

## Fixed accounts

| Email | Role | Organization | Purpose |
|---|---|---|---|
| `patient.demo@carepath.test` | patient | Fictional Desert Rehab | Main patient demo. Active plan with three versions (versions 2 and 3 carry a change note), session and check-in history, a visit booked for tomorrow, a message thread with an unread therapist reply, and a session due today (Scenario C). |
| `therapist.demo@carepath.test` | physical_therapist | Fictional Desert Rehab | Primary therapist for the demo patients. Has a review queue, today's calendar, draft and signed notes, and AI drafts (Scenarios B, D, F). |
| `coordinator.demo@carepath.test` | care_coordinator | Fictional Desert Rehab | Enrollment, assignment, scheduling and messaging (Scenarios A, E, H). |
| `admin.demo@carepath.test` | clinic_admin | Fictional Desert Rehab | Settings, availability, metrics and audit (Scenarios H, I). |
| `therapist.org2@carepath.test` | physical_therapist | Fictional Harbor Physical Therapy | Account in the second organization. Use it to try to open an organization 1 patient and expect a denial plus a security event (Scenario I). |

## Scenario personas (organization 1)

| Email | Role | Purpose |
|---|---|---|
| `patient.resume@carepath.test` | patient | Has a paused session from this morning, to show resume. |
| `patient.intake@carepath.test` | patient | Intake in progress at the pain step, no consents yet, with an open "Missing intake" task for the coordinator. |
| `patient.noai@carepath.test` | patient | Active, without the `ai_assisted_features` consent. AI generation for this patient must be refused. Has a booked visit today. |
| `patient.flare@carepath.test` | patient | Reported pain 8 about 20 hours before the anchor. An open "Reported pain" task, unassigned, sits in the therapist.demo queue. Has a booked visit today. |

## Eligibility codes (onboarding, Scenario A)

New patients sign up with an eligibility code (AC-A3). The seed stores only a SHA-256 hash of each code. Codes are matched without regard to spaces or letter case, so a pasted code works. Organization 1 (Fictional Desert Rehab):

| Code | State | Use it to |
|---|---|---|
| `CAREPATH-1-START-1` | Unused, valid for 90 days after the anchor | Complete onboarding as a new patient |
| `CAREPATH-1-START-2` | Unused, valid for 90 days after the anchor | A second onboarding run |
| `CAREPATH-1-START-3` | Unused, valid for 90 days after the anchor | A third onboarding run |
| `CAREPATH-1-USED` | Already redeemed by `patient.intake@carepath.test` | Expect a rejection with no account created |
| `CAREPATH-1-EXPIRED` | Expired the day before the anchor, never redeemed | Expect a rejection with no account created |

Organization N has the same five codes with N in place of 1 (for example `CAREPATH-2-START-1` for Fictional Harbor Physical Therapy). A code is used up once an account is created with it; re-run `pnpm db:seed` to make it available again.

## Clinic settings

Every seeded organization has a fictional clinic phone in the reserved 555-0100 to 555-0199 range (organization 1: `(555) 555-0110`) and the reply-time text "Your care team usually replies within one business day." The pain notice and the message composer read them.

## Other seeded logins

- Other patients: `patient.org<N>.<NNN>@carepath.test` (for example `patient.org1.007@carepath.test`). Some patients have no login on purpose (entered by staff).
- Other therapists: `pt.org<N>.<K>@carepath.test`.
- Other coordinators and administrators: `coordinator.org<N>@carepath.test` and `admin.org<N>@carepath.test` for organization N of 2 or more.

## What the small profile contains

2 organizations, 6 physical therapists, 2 coordinators, 2 administrators, 40 patients, 10 eligibility codes, 50 library exercises per organization (the same fictional 50), care plans with up to four versions, sessions and activity records (skipped activities carry the patient's reason; some sessions ended as stopped for discomfort), check-ins (some with pain 7 or higher), appointments (some cancelled, no-show or rescheduled), 8 encounters with transcripts and notes (signed, draft and amended), AI generations and reviews, conversations (one failed message), review tasks, notifications, jobs (one failed for good) and audit events. Edge cases are included on purpose: incomplete intake, patients waiting for assignment, inactive and discharged patients, patients without the AI consent or a login, and sparse records.

Run `pnpm db:seed --check` to re-run the integrity checks on the current database and print its content hash. The row counts and hash of the last run are in `docs/PROGRESS.md` (WP 2.6).
