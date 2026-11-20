import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import { auditEvents, createClinicalFixture } from "../support/fixtures/repo.js";
import {
  appointmentRow,
  createSlots,
  notificationsFor,
  setOrgTimezone,
  slotRow,
} from "../support/scheduling/repo.js";
import { sendAppointmentReminders } from "../../src/modules/scheduling/reminders.js";

/**
 * WP 4.1 scheduling: slots, book, cancel, reschedule, the clinician day (CR-1), Today's next
 * appointment and the 24-hour reminder job. PRD Scenario E, AC-E2 to AC-E7.
 */
const NOW = new Date("2026-11-19T16:00:00Z"); // Thursday, 09:00 in America/Phoenix
const H = 3_600_000;
const D = 24 * H;
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let patient: Session;
let other: Session;
let therapist: Session;
let coordinator: Session;
let admin: Session;

/** Phoenix has no daylight saving, so 09:00 local is always 16:00 UTC. */
function phoenix(date: string, hour: number): Date {
  return new Date(`${date}T${String(hour + 7).padStart(2, "0")}:00:00Z`);
}

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  await createClinicalFixture(db, org, NOW);
  patient = await login(app, org.patient.email);
  other = await login(app, org.otherPatient.email);
  therapist = await login(app, org.therapist.email);
  coordinator = await login(app, org.coordinator.email);
  admin = await login(app, org.admin.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const pid = () => org.patient.patientId;
const book = (s: Session, patientId: string, slotId: string, type = "follow_up") =>
  as(
    app,
    s,
  )({
    method: "POST",
    url: `/patients/${patientId}/appointments`,
    payload: { slotId, type },
  });

describe("slots", () => {
  it("lists open future slots grouped by clinic-zone day, with the zone named", async () => {
    const [a, b, c, past, blocked] = [
      phoenix("2026-11-23", 9),
      phoenix("2026-11-23", 10),
      phoenix("2026-11-24", 9),
      phoenix("2026-11-19", 8),
      phoenix("2026-11-24", 11),
    ];
    const pr = org.therapist.practitionerId;
    const [sa, sb, sc] = await createSlots(db, org.orgId, pr, [a, b, c]);
    await createSlots(db, org.orgId, pr, [past]);
    await createSlots(db, org.orgId, pr, [blocked], { status: "blocked" });
    const res = await as(
      app,
      patient,
    )({
      method: "GET",
      url: `/practitioners/${pr}/slots?from=2026-11-19&to=2026-11-24`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.timezone).toBe("America/Phoenix");
    expect(body.practitioner).toMatchObject({ practitionerId: pr, name: "Riley Example" });
    expect(body.days.map((d: { date: string }) => d.date)).toEqual(["2026-11-23", "2026-11-24"]);
    expect(body.days[0].slots.map((s: { id: string }) => s.id)).toEqual([sa, sb]);
    expect(body.days[1].slots.map((s: { id: string }) => s.id)).toEqual([sc]);
  });

  it("filters by visit type and rejects a range over 31 days", async () => {
    const pr = org.therapist.practitionerId;
    const [evalOnly] = await createSlots(db, org.orgId, pr, [phoenix("2026-11-25", 13)], {
      types: ["initial_evaluation"],
    });
    const s = as(app, coordinator);
    const followUps = (
      await s({
        method: "GET",
        url: `/practitioners/${pr}/slots?from=2026-11-25&to=2026-11-25&type=follow_up`,
      })
    ).json();
    expect(followUps.days).toEqual([]);
    const evals = (
      await s({
        method: "GET",
        url: `/practitioners/${pr}/slots?from=2026-11-25&to=2026-11-25&type=initial_evaluation`,
      })
    ).json();
    expect(evals.days[0].slots[0].id).toBe(evalOnly);
    const wide = await s({
      method: "GET",
      url: `/practitioners/${pr}/slots?from=2026-11-01&to=2026-12-31`,
    });
    expect(wide.statusCode).toBe(400);
  });

  it("shows a patient only the practitioners on their care team", async () => {
    const res = await as(
      app,
      patient,
    )({
      method: "GET",
      url: `/practitioners/${org.otherTherapist.practitionerId}/slots`,
    });
    expect(res.statusCode).toBe(404);
    const staff = await as(
      app,
      coordinator,
    )({
      method: "GET",
      url: `/practitioners/${org.otherTherapist.practitionerId}/slots`,
    });
    expect(staff.statusCode).toBe(200);
  });
});

describe("booking", () => {
  it("books a slot, marks it booked, audits it, and both calendars read the same row (AC-E2)", async () => {
    const [slot] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
      phoenix("2026-11-26", 9),
    ]);
    const res = await as(
      app,
      patient,
    )({
      method: "POST",
      url: `/patients/${pid()}/appointments`,
      payload: { slotId: slot, type: "follow_up", reason: "Review of progress" },
    });
    expect(res.statusCode).toBe(201);
    const appt = res.json();
    expect(appt).toMatchObject({
      patient: { id: pid() },
      practitioner: { practitionerId: org.therapist.practitionerId },
      slotId: slot,
      type: "follow_up",
      status: "booked",
      startsAt: phoenix("2026-11-26", 9).toISOString(),
      endsAt: phoenix("2026-11-26", 10).toISOString(),
      date: "2026-11-26",
      timezone: "America/Phoenix",
      reason: "Review of progress",
      bookedBy: { userId: org.patient.userId },
    });
    expect((await slotRow(db, slot!)).status).toBe("booked");
    const events = await auditEvents(db, {
      eventName: "appointment.book",
      organizationId: org.orgId,
    });
    expect(events.some((e) => e.resourceId === appt.id)).toBe(true);

    const mine = (
      await as(app, patient)({ method: "GET", url: `/patients/${pid()}/appointments` })
    ).json();
    const day = (
      await as(
        app,
        therapist,
      )({
        method: "GET",
        url: `/appointments?date=2026-11-26&practitionerId=${org.therapist.practitionerId}`,
      })
    ).json();
    const fromPatient = mine.items.find((i: { id: string }) => i.id === appt.id);
    const fromClinician = day.items.find((i: { id: string }) => i.id === appt.id);
    expect(fromPatient).toEqual(appt);
    expect(fromClinician).toEqual(appt);
    expect(day).toMatchObject({ date: "2026-11-26", timezone: "America/Phoenix" });
  });

  it("answers 409 booking_conflict for a slot that is already booked", async () => {
    const [slot] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
      phoenix("2026-11-27", 9),
    ]);
    expect((await book(patient, pid(), slot!)).statusCode).toBe(201);
    const res = await book(coordinator, org.otherPatient.patientId, slot!);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("booking_conflict");
  });

  it("answers 409 for an overlapping booking of the same patient with another clinician (AC-E3)", async () => {
    const at = phoenix("2026-11-30", 9);
    const [mine] = await createSlots(db, org.orgId, org.therapist.practitionerId, [at]);
    const [theirs] = await createSlots(db, org.orgId, org.otherTherapist.practitionerId, [at]);
    expect((await book(patient, pid(), mine!)).statusCode).toBe(201);
    const res = await book(coordinator, pid(), theirs!);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("booking_conflict");
    expect((await slotRow(db, theirs!)).status).toBe("open");
  });

  it("rejects a past slot and a blocked slot (AC-E6)", async () => {
    const [past] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
      phoenix("2026-11-19", 7),
    ]);
    const [blocked] = await createSlots(
      db,
      org.orgId,
      org.therapist.practitionerId,
      [phoenix("2026-12-01", 9)],
      { status: "blocked" },
    );
    for (const slot of [past!, blocked!]) {
      const res = await book(patient, pid(), slot);
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("slot_unavailable");
    }
  });

  it("lets a patient book only with their care team; coordinators book for anyone", async () => {
    const [slot] = await createSlots(db, org.orgId, org.otherTherapist.practitionerId, [
      phoenix("2026-12-02", 9),
    ]);
    const res = await book(patient, pid(), slot!);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0]).toMatchObject({
      path: "body.slotId",
      issue: "not_care_team_practitioner",
    });
    // otherPatient has no care team at all.
    const [mine] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
      phoenix("2026-12-02", 13),
    ]);
    expect((await book(other, org.otherPatient.patientId, mine!)).statusCode).toBe(400);
    expect((await book(coordinator, org.otherPatient.patientId, slot!)).statusCode).toBe(201);
    // Therapists and admins read appointments but do not book.
    expect((await book(therapist, pid(), mine!)).json().error.code).toBe("forbidden");
    expect((await book(admin, pid(), mine!)).json().error.code).toBe("forbidden");
  });

  it("rejects a visit type the slot does not offer and an unknown slot", async () => {
    const [slot] = await createSlots(
      db,
      org.orgId,
      org.therapist.practitionerId,
      [phoenix("2026-12-03", 9)],
      { types: ["follow_up"] },
    );
    const res = await book(patient, pid(), slot!, "initial_evaluation");
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0]).toMatchObject({ path: "body.type" });
    expect((await slotRow(db, slot!)).status).toBe("open");
    const unknown = await book(patient, pid(), "00000000-0000-4000-8000-000000000000");
    expect(unknown.statusCode).toBe(400);
  });
});

describe("cancel and reschedule", () => {
  it("cancels, reopens the slot in the same transaction and lets it be booked again (AC-E4)", async () => {
    const [slot] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
      phoenix("2026-12-04", 9),
    ]);
    const appt = (await book(patient, pid(), slot!)).json();
    const res = await as(
      app,
      patient,
    )({
      method: "POST",
      url: `/patients/${pid()}/appointments/${appt.id}/cancel`,
      payload: { reason: "Conflict with work schedule" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: "cancelled_by_patient",
      cancellationReason: "Conflict with work schedule",
      cancelledBy: { userId: org.patient.userId },
    });
    expect((await slotRow(db, slot!)).status).toBe("open");
    const events = await auditEvents(db, {
      eventName: "appointment.cancel",
      organizationId: org.orgId,
    });
    expect(events.some((e) => e.resourceId === appt.id)).toBe(true);

    // The clinician's day shows the cancellation from the same row.
    const day = (
      await as(
        app,
        therapist,
      )({
        method: "GET",
        url: `/appointments?date=2026-12-04&practitionerId=${org.therapist.practitionerId}`,
      })
    ).json();
    expect(day.items.find((i: { id: string }) => i.id === appt.id).status).toBe(
      "cancelled_by_patient",
    );

    const again = await book(coordinator, org.otherPatient.patientId, slot!);
    expect(again.statusCode).toBe(201);
    const twice = await as(
      app,
      patient,
    )({
      method: "POST",
      url: `/patients/${pid()}/appointments/${appt.id}/cancel`,
      payload: {},
    });
    expect(twice.statusCode).toBe(409);
    expect(twice.json().error.code).toBe("invalid_transition");
  });

  it("records a staff cancellation as cancelled_by_clinic", async () => {
    const [slot] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
      phoenix("2026-12-07", 9),
    ]);
    const appt = (await book(patient, pid(), slot!)).json();
    const res = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${pid()}/appointments/${appt.id}/cancel`,
      payload: { reason: null },
    });
    expect(res.json()).toMatchObject({ status: "cancelled_by_clinic", cancellationReason: null });
  });

  it("reschedules as cancel plus book in one transaction", async () => {
    const [from, to] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
      phoenix("2026-12-08", 9),
      phoenix("2026-12-08", 10),
    ]);
    const appt = (await book(patient, pid(), from!)).json();
    const res = await as(
      app,
      patient,
    )({
      method: "POST",
      url: `/patients/${pid()}/appointments/${appt.id}/reschedule`,
      payload: { slotId: to },
    });
    expect(res.statusCode).toBe(201);
    const moved = res.json();
    expect(moved).toMatchObject({ slotId: to, status: "booked", rescheduledFromId: appt.id });
    const old = await appointmentRow(db, appt.id);
    expect(old.status).toBe("cancelled_by_patient");
    expect((await slotRow(db, from!)).status).toBe("open");
    expect((await slotRow(db, to!)).status).toBe("booked");
    const history = (
      await as(app, patient)({ method: "GET", url: `/patients/${pid()}/appointments?when=past` })
    ).json();
    expect(history.items.find((i: { id: string }) => i.id === appt.id).rescheduledToId).toBe(
      moved.id,
    );
  });

  it("leaves the original booking unchanged when the new slot is taken (AC-E7)", async () => {
    const [from, taken] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
      phoenix("2026-12-09", 9),
      phoenix("2026-12-09", 10),
    ]);
    const appt = (await book(patient, pid(), from!)).json();
    expect((await book(coordinator, org.otherPatient.patientId, taken!)).statusCode).toBe(201);
    const res = await as(
      app,
      patient,
    )({
      method: "POST",
      url: `/patients/${pid()}/appointments/${appt.id}/reschedule`,
      payload: { slotId: taken },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("booking_conflict");
    const row = await appointmentRow(db, appt.id);
    expect(row.status).toBe("booked");
    expect(row.cancelledAt).toBeNull();
    expect((await slotRow(db, from!)).status).toBe("booked");
    const cancels = await auditEvents(db, {
      eventName: "appointment.cancel",
      organizationId: org.orgId,
    });
    expect(cancels.some((e) => e.resourceId === appt.id)).toBe(false);
  });
});

describe("clinician day (CR-1) and Today", () => {
  it("answers 400 for a practitioner of another organization and 403 for patients", async () => {
    const orgB = await createOrgFixture(db);
    const res = await as(
      app,
      therapist,
    )({
      method: "GET",
      url: `/appointments?date=2026-11-26&practitionerId=${orgB.therapist.practitionerId}`,
    });
    expect(res.statusCode).toBe(400);
    const p = await as(
      app,
      patient,
    )({
      method: "GET",
      url: `/appointments?date=2026-11-26&practitionerId=${org.therapist.practitionerId}`,
    });
    expect(p.json().error.code).toBe("forbidden");
  });

  it("shows the next booked visit on Today", async () => {
    const today = (
      await as(app, patient)({ method: "GET", url: `/patients/${pid()}/today` })
    ).json();
    // The earliest live booking made in this file is on 2026-11-26 at 09:00.
    expect(today.nextAppointment).toMatchObject({
      date: "2026-11-26",
      startsAt: phoenix("2026-11-26", 9).toISOString(),
      status: "booked",
      practitioner: { practitionerId: org.therapist.practitionerId },
    });
    const none = (
      await as(
        app,
        other,
      )({
        method: "GET",
        url: `/patients/${org.otherPatient.patientId}/today`,
      })
    ).json();
    expect(none.nextAppointment).toMatchObject({ date: "2026-12-02" });
  });
});

describe("time zones (AC-E5)", () => {
  it("groups slots and dates appointments by clinic day across a daylight-saving change", async () => {
    const east = await createOrgFixture(db);
    await createClinicalFixture(db, east, NOW);
    await setOrgTimezone(db, east.orgId, "America/New_York");
    // 09:00 in New York is 14:00 UTC before 2027-03-14 and 13:00 UTC after.
    const before = new Date("2027-03-13T14:00:00Z");
    const after = new Date("2027-03-15T13:00:00Z");
    const lateNight = new Date("2027-03-15T03:30:00Z"); // 23:30 on 2027-03-14 in New York
    const pr = east.therapist.practitionerId;
    const [sBefore, sAfter, sLate] = await createSlots(db, east.orgId, pr, [
      before,
      after,
      lateNight,
    ]);
    const c = as(app, await login(app, east.coordinator.email));
    const slots = (
      await c({ method: "GET", url: `/practitioners/${pr}/slots?from=2027-03-13&to=2027-03-15` })
    ).json();
    expect(slots.timezone).toBe("America/New_York");
    expect(
      slots.days.map((d: { date: string; slots: { id: string }[] }) => [
        d.date,
        d.slots.map((s) => s.id),
      ]),
    ).toEqual([
      ["2027-03-13", [sBefore]],
      ["2027-03-14", [sLate]],
      ["2027-03-15", [sAfter]],
    ]);
    const appt = (
      await book(await login(app, east.patient.email), east.patient.patientId, sLate!)
    ).json();
    expect(appt).toMatchObject({ date: "2027-03-14", timezone: "America/New_York" });
    const day = (
      await c({ method: "GET", url: `/appointments?date=2027-03-14&practitionerId=${pr}` })
    ).json();
    expect(day.items.map((i: { id: string }) => i.id)).toEqual([appt.id]);
  });
});

describe("24-hour reminder job (REQ-TOD-04)", () => {
  it("writes one in-app reminder per visit due within 24 hours, once, in its organization only", async () => {
    const r = await createOrgFixture(db);
    await createClinicalFixture(db, r, NOW);
    const pr = r.therapist.practitionerId;
    const [soon, later] = await createSlots(db, r.orgId, pr, [
      new Date(NOW.getTime() + 20 * H),
      new Date(NOW.getTime() + 30 * H),
    ]);
    const p = await login(app, r.patient.email);
    const a = (await book(p, r.patient.patientId, soon!)).json();
    await book(p, r.patient.patientId, later!);

    // Another organization's run touches nothing here.
    expect(await sendAppointmentReminders(db, { orgId: org.orgId }, NOW)).toBeGreaterThanOrEqual(0);
    expect(await notificationsFor(db, r.patient.userId, "appointment_reminder")).toHaveLength(0);

    expect(await sendAppointmentReminders(db, { orgId: r.orgId }, NOW)).toBe(1);
    expect(await sendAppointmentReminders(db, { orgId: r.orgId }, NOW)).toBe(0);
    const notes = await notificationsFor(db, r.patient.userId, "appointment_reminder");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      sourceType: "Appointment",
      sourceId: a.id,
      linkPath: "/appointments",
    });
    expect(notes[0]!.body).toContain("(America/Phoenix)");
    expect((await appointmentRow(db, a.id)).reminderSentAt?.toISOString()).toBe(NOW.toISOString());

    // A day later the second visit is due.
    expect(
      await sendAppointmentReminders(db, { orgId: r.orgId }, new Date(NOW.getTime() + D)),
    ).toBe(1);
  });
});
