# Booking concurrency (AC-E1, WP 4.1 gate)

Synthetic data only; not for clinical use. These are measured numbers from recorded gate runs, not targets.

## What is measured

`apps/api/test/phase4/booking-concurrency.test.ts`, run by `scripts/gate-wp-4.1.sh`:

- The API is built with `buildApp` and listens on `API_PORT` (4041 in the gate). Requests go over real HTTP with Node's `fetch`, so they reach Fastify, the Prisma pool and Postgres at the same time.
- One coordinator session books `POST /patients/:patientId/appointments` for 50 different patients of one organization, all for the same open slot, with `Promise.all`. Different patients mean the patient exclusion constraint cannot be what turns requests away; only the slot is shared.
- 20 repetitions, each on a new slot of the same therapist.
- Per repetition the test counts 201 responses, 409 responses with code `booking_conflict` and anything else, then reads the database: live (non-cancelled) appointments on the slot and the slot's status.
- Pass condition per repetition: exactly one 201, 49 times 409 `booking_conflict`, no other outcome, one live appointment, slot `booked`.
- Wall time: from sending the first request to the last response of the repetition. Slowest: the longest single request.

How the booking works (checkpoint C2 section 2): one transaction locks the slot row with `SELECT ... FOR UPDATE`, checks it is `open`, moves it to `booked`, inserts the appointment and writes `appointment.book`. Waiting transactions see `booked` once the first commits and answer 409. The exclusion constraints and the partial unique index `Appointment_slot_live_key` stay behind it and map to the same 409. Booking transactions may wait 15 s for a pool connection and run 20 s (Prisma defaults are 2 s and 5 s). The Prisma pg pool is the driver default (10 connections).

## Environment

- 2 CPUs, 7 GB memory, Linux 6.18, Node 22.23.5, PostgreSQL 16.15 (native cluster on port 54329 shared by all worktrees; another worker's gate may have been running at the same time).
- API and test client in one Node process; Postgres on the same machine.

## Run 1: `scripts/gate-wp-4.1.sh` on branch `wp/4.1` before the rebase onto WP 4.2 (gate PASSED, `pnpm verify` exit 0, clean tree)

| Rep | 201 | 409 booking_conflict | Other | Live appointments | Slot | Wall ms | Slowest ms |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 49 | 0 | 1 | booked | 579 | 545 |
| 2 | 1 | 49 | 0 | 1 | booked | 318 | 314 |
| 3 | 1 | 49 | 0 | 1 | booked | 286 | 282 |
| 4 | 1 | 49 | 0 | 1 | booked | 324 | 322 |
| 5 | 1 | 49 | 0 | 1 | booked | 339 | 331 |
| 6 | 1 | 49 | 0 | 1 | booked | 225 | 221 |
| 7 | 1 | 49 | 0 | 1 | booked | 231 | 228 |
| 8 | 1 | 49 | 0 | 1 | booked | 226 | 223 |
| 9 | 1 | 49 | 0 | 1 | booked | 215 | 213 |
| 10 | 1 | 49 | 0 | 1 | booked | 289 | 283 |
| 11 | 1 | 49 | 0 | 1 | booked | 173 | 169 |
| 12 | 1 | 49 | 0 | 1 | booked | 198 | 195 |
| 13 | 1 | 49 | 0 | 1 | booked | 194 | 191 |
| 14 | 1 | 49 | 0 | 1 | booked | 183 | 181 |
| 15 | 1 | 49 | 0 | 1 | booked | 185 | 181 |
| 16 | 1 | 49 | 0 | 1 | booked | 154 | 151 |
| 17 | 1 | 49 | 0 | 1 | booked | 177 | 173 |
| 18 | 1 | 49 | 0 | 1 | booked | 221 | 220 |
| 19 | 1 | 49 | 0 | 1 | booked | 157 | 154 |
| 20 | 1 | 49 | 0 | 1 | booked | 224 | 220 |

20 of 20 repetitions had exactly one 201 and 49 `booking_conflict`. Wall time: min 154 ms, median 224 ms, max 579 ms (the first repetition includes connection warm-up).

An earlier development run of the same test (not a gate run) also gave 20 of 20, wall time 190 to 649 ms.

## Limits

- One machine, one API process. Several API processes would add pools but not change the row lock.
- The test does not measure behaviour under a saturated database or a pool smaller than the burst.
