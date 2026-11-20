# Contract requests

UI workers (WP 3.2, 3.3 and later) never edit `packages/shared/src/contracts` or the API. When a screen needs a field, an endpoint, an error code or a new primitive in `packages/ui` that does not exist, append a request here and keep building other parts of the screen. Do not reshape responses on the client to work around a missing field, and do not merge a screen with placeholder data (checkpoint C1, sections 3.5 and 5.7).

The contract owner (the API worker) answers each request in the same entry and links the commit. Route names and contract names are in `docs/architecture/api-phase3.md`.

## How to write a request

Copy this block to the end of the file and fill every line.

```
### CR-<next number>: <short title>

- Requested by: <work package>, <date>
- Screen or test: <route group and page, or Playwright scenario>
- Endpoint and contract: <method path, contract name>
- What is missing: <field, endpoint, error code or primitive, with its type>
- Why: <acceptance criterion or requirement id>
- Status: open
- Answer: <filled in by the contract owner: accepted with commit, or declined with reason>
```

## Requests

### CR-1: Appointments on the clinician overview

- Requested by: WP 3.3, 2026-11-20
- Screen or test: `(clinician)/overview`, "Visits today"
- Endpoint and contract: `GET /overview`, `ClinicianOverview`; or `GET /appointments?date=<YYYY-MM-DD>&practitionerId=<id>`
- What is missing: a list of the signed-in clinician's appointments for the organization's current day (id, patient, start and end instants, visit type, status), with a count equal to the list length (REQ-OVR-01). The contract says appointment lists arrive in Phase 4.
- Why: the overview brief asks for today's appointments. Until Phase 4, the overview derives "Visits today" from the patient directory (`GET /patients?clinicianId=<me>&hasUpcomingAppointment=true`, `nextAppointmentAt` on today's date in the clinic zone). That shows only each patient's next visit, so a second visit for the same patient on the same day, a cancelled visit and the visit type are not visible.
- Status: open
- Answer:

### CR-2: Care-team membership on review tasks and the patient header

- Requested by: WP 3.3, 2026-11-20
- Screen or test: `(clinician)/review-queue`, patient record header and plan builder
- Endpoint and contract: `ReviewTask`, `PatientHeader` (or `CareTeamCard`)
- What is missing: a boolean `onCareTeam` for the signed-in clinician. `GET /review-tasks` lists every task in the clinic, but assign, resolve, dismiss and plan saves answer 403 `not_on_care_team` for a patient outside the clinician's care teams.
- Why: AC-B6, AC-D5. Without the flag the UI offers actions that it already knows will be refused and explains the refusal only afterwards. The UI handles the 403 with a plain message today.
- Status: open
- Answer:

### CR-3: Total count on the patient directory

- Requested by: WP 3.3, 2026-11-20
- Screen or test: `(clinician)/patients`
- Endpoint and contract: `GET /patients`, `PatientDirectoryPage`
- What is missing: `total: number`, the count of rows matching the query ignoring the cursor.
- Why: REQ-DIR-01 and interaction principle 11 ask for a visible count. Cursor pages cannot say "21 to 40 of 312", so the footer says "Page 2, 25 patients shown, more on the next page". Not a blocker.
- Status: open
- Answer:
