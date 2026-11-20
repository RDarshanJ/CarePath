/**
 * Availability slots and appointments. Every therapist works Monday to Friday on an hourly
 * grid in the clinic's local time. An appointment takes one grid cell, so cancelled and live
 * bookings never overlap per therapist or per patient, and the database exclusion constraints
 * (ADR-9) are satisfied by construction. Rows are inserted with their final status, which the
 * UPDATE-only transition trigger allows.
 */
import {
  D,
  H,
  MIN,
  iso,
  type ApptInfo,
  type Ctx,
  type OrgInfo,
  type PatientInfo,
  type TherapistInfo,
} from "./ctx.js";
import type { Tables } from "./types.js";

const HOURS = [8, 9, 10, 11, 13, 14, 15, 16] as const;
const EVAL_HOURS = [9, 10, 13] as const;
const reasons = [
  "Follow-up on exercise plan",
  "Review of progress",
  "Check how the plan is going",
  "Talk through a plan change",
];
const cancelReasons = [
  "Conflict with work schedule",
  "Feeling unwell",
  "Transport problem",
  "Clinic schedule change",
  "Therapist unavailable",
];

type Slot = { row: Tables["AvailabilitySlot"][number]; used: boolean; k: number; h: number };
type ApptType = ApptInfo["type"];

export function buildScheduling(ctx: Ctx): void {
  const { t, profile } = ctx;
  const rng = ctx.rng.fork("scheduling");
  const slots = new Map<string, Slot>();
  const replaced = new Set<string>();
  const patientBusy = new Set<string>();
  const slotKey = (th: TherapistInfo, k: number, h: number) => `${th.practitionerId}|${k}|${h}`;
  const slotsCreated = iso(ctx.anchorMs - (profile.historyDays + 30) * D);

  // ---- availability ---------------------------------------------------------------------
  for (const org of ctx.orgs) {
    for (const th of org.therapists) {
      for (let k = -profile.historyDays; k <= profile.futureDays; k++) {
        const wd = ctx.weekday(org, k);
        if (wd < 1 || wd > 5) continue;
        for (const h of HOURS) {
          const start = ctx.localMidnight(org, k) + h * H;
          const row: Tables["AvailabilitySlot"][number] = {
            id: ctx.id("slot", `${th.practitionerId}/${k}/${h}`),
            organizationId: org.id,
            practitionerId: th.practitionerId,
            startsAt: iso(start),
            endsAt: iso(start + H),
            status: "open",
            appointmentTypes: (EVAL_HOURS as readonly number[]).includes(h)
              ? ["initial_evaluation", "follow_up", "video_follow_up"]
              : ["follow_up", "video_follow_up"],
            createdAt: slotsCreated,
            updatedAt: slotsCreated,
          };
          t.AvailabilitySlot.push(row);
          slots.set(slotKey(th, k, h), { row, used: false, k, h });
        }
      }
    }
  }

  // ---- placement ------------------------------------------------------------------------
  const nearestWeekday = (org: OrgInfo, k: number, dir: 1 | -1): number => {
    let x = k;
    while (ctx.weekday(org, x) < 1 || ctx.weekday(org, x) > 5) x += dir;
    return x;
  };

  const place = (
    p: PatientInfo,
    th: TherapistInfo,
    k: number,
    h: number,
    type: ApptType,
    forced: { status?: ApptInfo["status"]; rescheduledFromId?: string; reason?: string } = {},
  ): ApptInfo | null => {
    const slot = slots.get(slotKey(th, k, h));
    if (!slot || slot.used) return null;
    if (type === "initial_evaluation" && !(EVAL_HOURS as readonly number[]).includes(h))
      return null;
    const busy = `${p.id}|${k}|${h}`;
    if (patientBusy.has(busy)) return null;
    const startMs = ctx.localMidnight(p.org, k) + h * H;
    const endMs = startMs + (type === "initial_evaluation" ? 60 : 45) * MIN;
    if (startMs < p.createdAtMs + 2 * H) return null;

    const past = endMs <= ctx.anchorMs;
    let status: ApptInfo["status"];
    if (forced.status) status = forced.status;
    else if (past)
      status = rng.weighted<ApptInfo["status"]>([
        ["completed", 72],
        ["no_show", 6],
        ["cancelled_by_patient", 14],
        ["cancelled_by_clinic", 8],
      ]);
    else if (startMs >= ctx.anchorMs + D)
      status = rng.weighted<ApptInfo["status"]>([
        ["booked", 90],
        ["cancelled_by_patient", 6],
        ["requested", 4],
      ]);
    else status = "booked";
    // Patients without a login are booked by the coordinator.
    const bookedBy = p.userId && rng.chance(0.7) ? p.userId : p.org.coordinatorUserId;
    const createdMs = Math.max(
      p.createdAtMs + H,
      Math.min(startMs - rng.int(2, 20) * D, startMs - 2 * H, ctx.anchorMs - H),
    );
    const cancelled = status === "cancelled_by_patient" || status === "cancelled_by_clinic";
    const cancelledMs = cancelled
      ? Math.max(createdMs + H, Math.min(startMs - rng.int(2, 48) * H, ctx.anchorMs - H))
      : null;
    const cancelledBy =
      status === "cancelled_by_patient"
        ? (p.userId ?? p.org.coordinatorUserId)
        : rng.chance(0.5)
          ? th.userId
          : p.org.coordinatorUserId;
    const live = !cancelled;
    const reminderMs =
      live &&
      status !== "requested" &&
      startMs - D >= createdMs &&
      startMs - D <= ctx.anchorMs &&
      (!past || rng.chance(0.6))
        ? startMs - D
        : null;

    const id = ctx.id("appointment", `${p.id}/${k}/${h}`);
    const row: Tables["Appointment"][number] = {
      id,
      organizationId: p.org.id,
      patientId: p.id,
      practitionerId: th.practitionerId,
      slotId: slot.row.id,
      type,
      status,
      startsAt: iso(startMs),
      endsAt: iso(endMs),
      bookedTimezone: p.org.timezone,
      reason:
        forced.reason ??
        (type === "initial_evaluation"
          ? "Initial evaluation"
          : rng.chance(0.7)
            ? rng.pick(reasons)
            : null),
      bookedByUserId: status === "requested" ? (p.userId ?? p.org.coordinatorUserId) : bookedBy,
      cancelledAt: cancelledMs === null ? null : iso(cancelledMs),
      cancellationReason: cancelled
        ? rng.chance(0.8)
          ? rng.pick(cancelReasons)
          : null
        : status === "no_show" && rng.chance(0.5)
          ? "Did not attend"
          : null,
      cancelledByUserId: cancelled ? cancelledBy : null,
      rescheduledFromId: forced.rescheduledFromId ?? null,
      reminderSentAt: reminderMs === null ? null : iso(reminderMs),
      createdAt: iso(createdMs),
      updatedAt: iso(cancelledMs ?? (past && live ? endMs : Math.max(createdMs, reminderMs ?? 0))),
    };
    slot.used = true;
    if (live) {
      slot.row.status = "booked";
      slot.row.updatedAt = iso(createdMs);
    }
    patientBusy.add(busy);
    t.Appointment.push(row);
    const info: ApptInfo = { id, patient: p, therapist: th, type, status, startMs, endMs, row };
    ctx.appointments.push(info);
    return info;
  };

  const tryPlace = (
    p: PatientInfo,
    th: TherapistInfo,
    kPref: number,
    type: ApptType,
    forced = {},
  ): ApptInfo | null => {
    const hours = type === "initial_evaluation" ? EVAL_HOURS : HOURS;
    for (const dk of [0, 1, -1, 2, -2, 3]) {
      const k = kPref + dk;
      if (k < -profile.historyDays || k > profile.futureDays) continue;
      const wd = ctx.weekday(p.org, k);
      if (wd < 1 || wd > 5) continue;
      for (const h of rng.shuffle(hours)) {
        const placed = place(p, th, k, h, type, forced);
        if (placed) return placed;
      }
    }
    return null;
  };

  /** Replace a cancelled appointment with a later one linked by rescheduledFromId. */
  const reschedule = (original: ApptInfo): ApptInfo | null => {
    if (replaced.has(original.id)) return null;
    replaced.add(original.id);
    const p = original.patient;
    const k0 = ctx.dayOffsetOf(p.org, original.startMs);
    const kNew = Math.min(profile.futureDays, k0 + rng.int(1, 10));
    const type: ApptType =
      original.type === "initial_evaluation" ? "initial_evaluation" : "follow_up";
    return tryPlace(p, original.therapist, kNew, type, { rescheduledFromId: original.id });
  };

  const target = profile.appointments;
  const planned = ctx.patients.filter((p) => p.therapist && p.versions.length > 0);

  // Demo patient: a past visit, a rescheduled pair and a booking for tomorrow.
  const demo = ctx.patients.find((p) => p.persona === "demo");
  if (demo?.therapist) {
    const th = demo.therapist;
    const org = demo.org;
    tryPlace(demo, th, nearestWeekday(org, -14, -1), "follow_up", {
      status: "completed",
      reason: "Review of progress",
    });
    const cancelled = tryPlace(demo, th, nearestWeekday(org, -24, -1), "follow_up", {
      status: "cancelled_by_patient",
      reason: "Review of progress",
    });
    if (cancelled) {
      replaced.add(cancelled.id);
      tryPlace(demo, th, ctx.dayOffsetOf(org, cancelled.startMs) + 3, "follow_up", {
        status: "completed",
        rescheduledFromId: cancelled.id,
        reason: "Review of progress",
      });
    }
    tryPlace(demo, th, nearestWeekday(org, 1, 1), "follow_up", {
      status: "booked",
      reason: "Review of progress",
    });
  }
  // Today's calendar for therapist.demo.
  for (const [persona, k, h] of [
    ["flare", 0, 11],
    ["noai", 0, 14],
  ] as const) {
    const p = ctx.patients.find((x) => x.persona === persona);
    if (p?.therapist) place(p, p.therapist, k, h, "follow_up", { status: "booked" });
  }

  // Initial evaluations: a past one for each patient with a plan, a future one for patients waiting.
  for (const p of planned) {
    if (ctx.appointments.length >= target) break;
    const k = ctx.dayOffsetOf(p.org, p.planStartMs) - 1;
    if (k < -profile.historyDays || k > -1) continue;
    tryPlace(p, p.therapist as TherapistInfo, k, "initial_evaluation", { status: "completed" });
  }
  for (const p of ctx.patients) {
    if (p.status !== "awaiting_assignment" || ctx.appointments.length >= target) continue;
    const th = rng.pick(p.org.therapists);
    tryPlace(p, th, rng.int(1, profile.futureDays), "initial_evaluation", {
      status: rng.chance(0.8) ? "booked" : "requested",
    });
  }

  // Replacements for cancelled bookings so far, then random fill to the target.
  for (const a of [...ctx.appointments]) {
    if (
      (a.status === "cancelled_by_patient" || a.status === "cancelled_by_clinic") &&
      ctx.appointments.length < target &&
      rng.chance(0.5)
    )
      reschedule(a);
  }
  const weights = planned.map((p) =>
    p.status === "active" ? 5 : p.status === "inactive" ? 1 : 1.5,
  );
  let attempts = 0;
  while (ctx.appointments.length < target && planned.length > 0 && attempts < target * 80) {
    attempts += 1;
    const p = rng.weighted(planned.map((x, i) => [x, weights[i] as number] as const));
    const kMin = Math.max(-profile.historyDays, ctx.dayOffsetOf(p.org, p.planStartMs) + 2);
    const kMax =
      p.status === "active"
        ? profile.futureDays
        : Math.min(-1, ctx.dayOffsetOf(p.org, p.activeEndMs));
    if (kMax < kMin) continue;
    const k = rng.int(kMin, kMax);
    const th = rng.chance(0.85) ? (p.therapist as TherapistInfo) : rng.pick(p.org.therapists);
    const type: ApptType = rng.chance(0.8) ? "follow_up" : "video_follow_up";
    const a = tryPlace(p, th, k, type);
    if (
      a &&
      (a.status === "cancelled_by_patient" || a.status === "cancelled_by_clinic") &&
      ctx.appointments.length < target &&
      rng.chance(0.4)
    )
      reschedule(a);
  }

  // Edge-case guarantee for any seed: at least one past visit the patient did not attend.
  if (!ctx.appointments.some((a) => a.status === "no_show")) {
    const pick = [...ctx.appointments]
      .reverse()
      .find((a) => a.status === "completed" && a.patient.persona === null);
    if (pick) {
      pick.status = "no_show";
      pick.row.status = "no_show";
      pick.row.cancellationReason = "Did not attend";
    }
  }

  // Edge-case guarantee for any seed and anchor: at least one visit the clinic cancelled.
  if (!ctx.appointments.some((a) => a.status === "cancelled_by_clinic")) {
    const pick = ctx.appointments.find(
      (a) => a.status === "cancelled_by_patient" && a.patient.persona === null,
    );
    if (pick) {
      pick.status = "cancelled_by_clinic";
      pick.row.status = "cancelled_by_clinic";
      pick.row.cancelledByUserId = pick.patient.org.coordinatorUserId;
    }
  }

  // Some unused slots are blocked (time off, meetings).
  for (const s of slots.values()) {
    if (!s.used && rng.chance(0.05)) s.row.status = "blocked";
  }
}
