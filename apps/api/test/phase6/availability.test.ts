import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  AvailabilityAdded,
  AvailabilityList,
  AvailabilitySlot,
} from "@carepath/shared/contracts";
import { as, login, testApp, type Session } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  type OrgFixture,
} from "../support/repo.js";
import { createClinicalFixture } from "../support/fixtures/repo.js";
import { createSlots } from "../support/scheduling/repo.js";

/**
 * WP 6.1, CR-14: availability writes (add, block, unblock, remove), conflicts, audit,
 * permissions, and the clinician agenda's open times (earlier today included).
 * Clock: Thursday 2026-11-19 09:00 in America/Phoenix (16:00 UTC).
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let other: OrgFixture;
let admin: Session;
let coordinator: Session;
let therapist: Session;
let otherTherapist: Session;
let patient: Session;
let bAdmin: Session;
let bTherapist: Session;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  other = await createOrgFixture(db);
  await createClinicalFixture(db, org, NOW);
  await createClinicalFixture(db, other, NOW);
  admin = await login(app, org.admin.email);
  coordinator = await login(app, org.coordinator.email);
  therapist = await login(app, org.therapist.email);
  otherTherapist = await login(app, org.otherTherapist.email);
  patient = await login(app, org.patient.email);
  bAdmin = await login(app, other.admin.email);
  bTherapist = await login(app, other.therapist.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const prac = () => org.therapist.practitionerId;
const add = (s: Session, practitionerId: string, body: Record<string, unknown>) =>
  as(
    app,
    s,
  )({ method: "POST", url: `/practitioners/${practitionerId}/availability`, payload: body });
const base = {
  slotMinutes: 45,
  appointmentTypes: ["follow_up"],
};
/** Phoenix is UTC-7 all year. */
const utc = (date: string, hour: number, minute = 0) =>
  new Date(`${date}T${String(hour + 7).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`);

async function slotsOn(practitionerId: string, from: string, to = from) {
  const res = await as(
    app,
    admin,
  )({
    method: "GET",
    url: `/practitioners/${practitionerId}/availability?from=${from}&to=${to}`,
  });
  expect(res.statusCode, res.body).toBe(200);
  return res.json() as AvailabilityList;
}

describe("add times", () => {
  it("splits a range into slots in the clinic zone and audits it", async () => {
    const res = await add(coordinator, prac(), {
      ...base,
      date: "2026-11-24",
      startTime: "09:00",
      endTime: "12:00",
    });
    expect(res.statusCode, res.body).toBe(201);
    const body = res.json() as AvailabilityAdded;
    expect(body.timezone).toBe("America/Phoenix");
    expect(body.created.map((s) => s.startsAt)).toEqual(
      [0, 45, 90, 135].map((m) =>
        new Date(utc("2026-11-24", 9).getTime() + m * 60_000).toISOString(),
      ),
    );
    expect(body.leftoverMinutes).toBe(0);
    expect(body.created.every((s) => s.status === "open" && !s.past && s.minutes === 45)).toBe(
      true,
    );
    const events = (await auditEventsForRequest(db, res.headers["x-request-id"] as string)).filter(
      (e) => e.eventName === "availability.update",
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: "C",
      outcome: "success",
      resourceId: prac(),
      purposeOfUse: "admin",
    });
    expect(events[0]!.metadata).toMatchObject({ op: "add", date: "2026-11-24", count: 4 });
  });

  it("states the leftover minutes when the slot length does not divide the range", async () => {
    const res = await add(admin, prac(), {
      date: "2026-11-25",
      startTime: "09:00",
      endTime: "11:00",
      slotMinutes: 50,
      appointmentTypes: ["initial_evaluation", "follow_up"],
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().created).toHaveLength(2);
    expect(res.json().leftoverMinutes).toBe(20);
  });

  it("answers 409 availability_overlap and creates nothing when any time overlaps", async () => {
    const before = (await slotsOn(prac(), "2026-11-24")).days[0]!.slots.length;
    const res = await add(coordinator, prac(), {
      ...base,
      date: "2026-11-24",
      startTime: "11:00",
      endTime: "13:00",
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("availability_overlap");
    expect((await slotsOn(prac(), "2026-11-24")).days[0]!.slots).toHaveLength(before);
  });

  it("records blocked times with status blocked", async () => {
    const res = await add(coordinator, prac(), {
      ...base,
      slotMinutes: 60,
      date: "2026-11-26",
      startTime: "12:00",
      endTime: "13:00",
      status: "blocked",
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().created[0].status).toBe("blocked");
  });

  it.each([
    ["end before start", { startTime: "12:00", endTime: "09:00" }, "end_before_start"],
    ["slot longer than the range", { startTime: "09:00", endTime: "09:30" }, "longer_than_range"],
    [
      "a time that has started",
      { date: "2026-11-19", startTime: "08:00", endTime: "10:00" },
      "past_time",
    ],
    ["a past day", { date: "2026-11-10", startTime: "08:00", endTime: "10:00" }, "past_time"],
  ])("rejects %s", async (_n, patch, issue) => {
    const body: Record<string, unknown> = {
      ...base,
      date: "2026-11-27",
      startTime: "09:00",
      endTime: "10:00",
    };
    const res = await add(coordinator, prac(), Object.assign(body, patch));
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].issue).toBe(issue);
  });

  it("rejects unknown fields, bad clock times and a practitioner of another organization", async () => {
    const body = { ...base, date: "2026-11-27", startTime: "09:00", endTime: "10:00" };
    expect((await add(coordinator, prac(), { ...body, status: "open", extra: 1 })).statusCode).toBe(
      400,
    );
    expect((await add(coordinator, prac(), { ...body, startTime: "9am" })).statusCode).toBe(400);
    const res = await add(bAdmin, prac(), body);
    expect(res.statusCode).toBe(404);
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.some((e) => e.eventName === "security.access_denied")).toBe(true);
  });
});

describe("block, unblock and remove", () => {
  async function fresh(day: number): Promise<string> {
    const [id] = await createSlots(db, org.orgId, prac(), [new Date(Date.UTC(2027, 2, day, 17))]);
    return id!;
  }
  const act = (s: Session, method: "POST" | "DELETE", id: string, op = "") =>
    as(
      app,
      s,
    )({
      method,
      url: `/availability/slots/${id}${op}`,
      ...(method === "POST" ? { payload: {} } : {}),
    });

  it("blocks an open time and opens it again; blocking twice is a 409", async () => {
    const id = await fresh(1);
    const blocked = await act(coordinator, "POST", id, "/block");
    expect(blocked.statusCode, blocked.body).toBe(200);
    expect((blocked.json() as AvailabilitySlot).status).toBe("blocked");
    expect((await act(coordinator, "POST", id, "/block")).json().error.code).toBe(
      "invalid_transition",
    );
    const open = await act(coordinator, "POST", id, "/unblock");
    expect((open.json() as AvailabilitySlot).status).toBe("open");
    expect((await act(coordinator, "POST", id, "/unblock")).statusCode).toBe(409);
    const events = await db.auditEvent.findMany({
      where: { resourceId: id, eventName: "availability.update" },
    });
    expect(events.map((e) => (e.metadata as Record<string, unknown>)["op"]).sort()).toEqual([
      "block",
      "unblock",
    ]);
  });

  it("a blocked time cannot be booked", async () => {
    const id = await fresh(2);
    await act(coordinator, "POST", id, "/block");
    const res = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${org.otherPatient.patientId}/appointments`,
      payload: { slotId: id, type: "follow_up" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("slot_unavailable");
  });

  it("a booked time cannot be blocked or removed (409 slot_booked) until the visit is cancelled", async () => {
    const id = await fresh(3);
    const booked = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${org.otherPatient.patientId}/appointments`,
      payload: { slotId: id, type: "follow_up" },
    });
    expect(booked.statusCode, booked.body).toBe(201);
    for (const res of [
      await act(coordinator, "POST", id, "/block"),
      await act(coordinator, "DELETE", id),
    ]) {
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("slot_booked");
    }
    const listed = (await slotsOn(prac(), "2027-03-03")).days[0]!.slots[0]!;
    expect(listed).toMatchObject({
      status: "booked",
      appointment: { status: "booked", patient: { id: org.otherPatient.patientId } },
    });
    // Cancel: the slot opens again; removing it now blocks it instead, because the visit's history points at it.
    const cancel = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${org.otherPatient.patientId}/appointments/${booked.json().id}/cancel`,
      payload: {},
    });
    expect(cancel.statusCode).toBe(200);
    const removed = await act(coordinator, "DELETE", id);
    expect(removed.statusCode, removed.body).toBe(200);
    expect(removed.json()).toMatchObject({
      id,
      outcome: "blocked_instead",
      slot: { status: "blocked" },
    });
  });

  it("removes a never-booked time, audits it, and a booking of it is then refused", async () => {
    const id = await fresh(4);
    const res = await act(admin, "DELETE", id);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id, outcome: "removed", slot: null });
    expect(await db.availabilitySlot.count({ where: { id } })).toBe(0);
    const events = await db.auditEvent.findMany({ where: { resourceId: id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: "D", eventName: "availability.update" });
    const book = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${org.otherPatient.patientId}/appointments`,
      payload: { slotId: id, type: "follow_up" },
    });
    expect(book.statusCode).toBe(400);
    expect((await act(admin, "DELETE", id)).statusCode).toBe(404);
  });

  it("a time that has started cannot be changed (409 availability_past)", async () => {
    const [id] = await createSlots(db, org.orgId, prac(), [new Date("2026-11-19T14:00:00Z")]);
    for (const res of [
      await act(coordinator, "POST", id!, "/block"),
      await act(coordinator, "DELETE", id!),
    ]) {
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("availability_past");
    }
  });

  it("a booking and a removal of one time cannot both succeed", async () => {
    for (let round = 0; round < 8; round++) {
      const id = await fresh(10 + round);
      const [book, remove] = await Promise.all([
        as(
          app,
          coordinator,
        )({
          method: "POST",
          url: `/patients/${org.otherPatient.patientId}/appointments`,
          payload: { slotId: id, type: "follow_up" },
        }),
        act(coordinator, "DELETE", id),
      ]);
      const live = await db.appointment.count({ where: { slotId: id, status: "booked" } });
      const slot = await db.availabilitySlot.count({ where: { id } });
      if (remove.statusCode === 200) {
        expect(book.statusCode).toBe(400);
        expect(live).toBe(0);
      } else {
        expect(remove.json().error.code).toBe("slot_booked");
        expect(book.statusCode).toBe(201);
        expect([live, slot]).toEqual([1, 1]);
      }
    }
  });
});

describe("listing", () => {
  it("returns every day of the range with open, booked and blocked counts", async () => {
    const list = await slotsOn(prac(), "2026-11-24", "2026-11-26");
    expect(list.days.map((d) => d.date)).toEqual(["2026-11-24", "2026-11-25", "2026-11-26"]);
    expect(list.days.map((d) => [d.openCount, d.bookedCount, d.blockedCount])).toEqual([
      [4, 0, 0],
      [2, 0, 0],
      [0, 0, 1],
    ]);
    const res = await as(
      app,
      admin,
    )({
      method: "GET",
      url: `/practitioners/${prac()}/availability?from=2026-11-01&to=2027-01-30`,
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("agenda open times (CR-14)", () => {
  it("lists open times of the day, earlier ones included and marked past", async () => {
    const day = "2026-11-19";
    await createSlots(db, org.orgId, prac(), [utc(day, 5), utc(day, 12)]);
    await createSlots(db, org.orgId, prac(), [utc(day, 8)], { status: "blocked" });
    const res = await as(
      app,
      therapist,
    )({
      method: "GET",
      url: `/appointments?date=${day}&practitionerId=${prac()}`,
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    expect(
      body.openTimes.map((t: { startsAt: string; past: boolean }) => [t.startsAt, t.past]),
    ).toEqual([
      [utc(day, 5).toISOString(), true],
      [utc(day, 7).toISOString(), true], // made by the past-time test above
      [utc(day, 12).toISOString(), false],
    ]);
    expect(body.items).toEqual([]);
  });
});

describe("permissions", () => {
  it("a therapist manages only their own times; a patient and another organization are refused", async () => {
    const own = await as(
      app,
      therapist,
    )({ method: "GET", url: `/practitioners/${prac()}/availability` });
    expect(own.statusCode).toBe(200);
    const ownAdd = await add(therapist, prac(), {
      ...base,
      date: "2026-12-01",
      startTime: "09:00",
      endTime: "10:30",
    });
    expect(ownAdd.statusCode).toBe(201);
    const someoneElse = await add(therapist, org.otherTherapist.practitionerId, {
      ...base,
      date: "2026-12-01",
      startTime: "09:00",
      endTime: "10:30",
    });
    expect(someoneElse.statusCode).toBe(403);
    const events = await auditEventsForRequest(db, someoneElse.headers["x-request-id"] as string);
    expect(
      events.some(
        (e) => e.eventName === "security.access_denied" && e.detailCode === "not_own_availability",
      ),
    ).toBe(true);
    const slotId = ownAdd.json().created[0].id as string;
    expect(
      (await as(app, otherTherapist)({ method: "DELETE", url: `/availability/slots/${slotId}` }))
        .statusCode,
    ).toBe(403);
    expect(
      (await as(app, patient)({ method: "DELETE", url: `/availability/slots/${slotId}` }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await add(patient, prac(), {
          ...base,
          date: "2026-12-01",
          startTime: "09:00",
          endTime: "10:30",
        })
      ).statusCode,
    ).toBe(403);
    for (const s of [bAdmin, bTherapist]) {
      const res = await as(app, s)({ method: "DELETE", url: `/availability/slots/${slotId}` });
      expect(res.statusCode).toBe(404);
      const ev = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
      expect(
        ev.some((e) => e.eventName === "security.access_denied" && e.detailCode === "out_of_scope"),
      ).toBe(true);
    }
    expect(await db.availabilitySlot.count({ where: { id: slotId } })).toBe(1);
  });
});
