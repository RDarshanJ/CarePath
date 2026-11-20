import { writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { login, ORIGIN, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import { createClinicalFixture } from "../support/fixtures/repo.js";
import {
  appointmentsForSlot,
  createSlots,
  extraPatients,
  slotRow,
} from "../support/scheduling/repo.js";

/**
 * AC-E1 and the WP 4.1 gate: 50 parallel booking requests for one slot, repeated 20 times. Each
 * repetition must end with exactly one 201, 49 times 409 `booking_conflict`, one live
 * appointment on the slot and the slot `booked`.
 *
 * The requests go over real HTTP to a listening server (API_PORT in a gate, else a free port),
 * so they reach Fastify, the Prisma pool and Postgres concurrently, not one after another. A
 * coordinator books for 50 different patients, so the only thing the requests share is the
 * slot: the patient exclusion constraint cannot be what turns them away. Per-repetition counts
 * and timings are printed and, when BOOKING_CONCURRENCY_OUT is set, written there as JSON for
 * docs/evaluation/booking-concurrency.md.
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const PARALLEL = 50;
const REPETITIONS = 20;
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let coordinator: Session;
let patients: string[];
let baseUrl: string;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  await createClinicalFixture(db, org, NOW);
  patients = await extraPatients(db, org, PARALLEL);
  coordinator = await login(app, org.coordinator.email);
  const port = Number(process.env["API_PORT"] ?? 0);
  await app.listen({ host: "127.0.0.1", port });
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("server has no port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

interface Repetition {
  repetition: number;
  created: number;
  bookingConflict: number;
  other: number;
  otherStatuses: string[];
  wallMs: number;
  slowestMs: number;
  liveAppointments: number;
  slotStatus: string;
}

async function attempt(patientId: string, slotId: string) {
  const started = performance.now();
  const res = await fetch(`${baseUrl}/patients/${patientId}/appointments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: coordinator.cookie,
      origin: ORIGIN,
      "x-csrf-token": coordinator.csrfToken,
    },
    body: JSON.stringify({ slotId, type: "follow_up" }),
  });
  const body = (await res.json()) as { error?: { code: string } };
  return { status: res.status, code: body.error?.code ?? null, ms: performance.now() - started };
}

describe("AC-E1: 50 parallel bookings of one slot, 20 repetitions", () => {
  it("lets exactly one booking through every time", { timeout: 300_000 }, async () => {
    const day = 86_400_000;
    const starts = Array.from(
      { length: REPETITIONS },
      (_, i) => new Date(NOW.getTime() + 7 * day + i * 3_600_000),
    );
    const slots = await createSlots(db, org.orgId, org.therapist.practitionerId, starts);
    const results: Repetition[] = [];
    for (const [i, slotId] of slots.entries()) {
      const started = performance.now();
      const outcomes = await Promise.all(patients.map((p) => attempt(p, slotId)));
      const wallMs = performance.now() - started;
      const live = (await appointmentsForSlot(db, slotId)).filter(
        (a) => a.status !== "cancelled_by_patient" && a.status !== "cancelled_by_clinic",
      );
      const others = outcomes.filter(
        (o) => o.status !== 201 && !(o.status === 409 && o.code === "booking_conflict"),
      );
      results.push({
        repetition: i + 1,
        created: outcomes.filter((o) => o.status === 201).length,
        bookingConflict: outcomes.filter((o) => o.status === 409 && o.code === "booking_conflict")
          .length,
        other: others.length,
        otherStatuses: others.map((o) => `${o.status} ${o.code ?? ""}`.trim()),
        wallMs: Math.round(wallMs),
        slowestMs: Math.round(Math.max(...outcomes.map((o) => o.ms))),
        liveAppointments: live.length,
        slotStatus: (await slotRow(db, slotId)).status,
      });
    }

    for (const r of results) {
      console.log(
        `booking-concurrency rep ${String(r.repetition).padStart(2)}: 201=${r.created} 409 booking_conflict=${r.bookingConflict} other=${r.other} live=${r.liveAppointments} slot=${r.slotStatus} wall=${r.wallMs}ms slowest=${r.slowestMs}ms`,
      );
    }
    const out = process.env["BOOKING_CONCURRENCY_OUT"];
    if (out) {
      await writeFile(
        out,
        JSON.stringify({ parallel: PARALLEL, repetitions: REPETITIONS, results }, null, 2),
      );
    }

    for (const r of results) {
      expect(r).toMatchObject({
        created: 1,
        bookingConflict: PARALLEL - 1,
        other: 0,
        liveAppointments: 1,
        slotStatus: "booked",
      });
    }
  });
});
