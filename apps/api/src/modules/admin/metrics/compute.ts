import type { metricListKeys } from "@carepath/shared/contracts";
import {
  priorityLevelOf,
  type MetricKey,
  type MetricListRole,
  type MetricRow,
  type ReviewBand,
} from "@carepath/shared/contracts";
import { addDays, localDate, startOfLocalDay, weekday } from "../../../core/time.js";
import { versionOn, type ScheduleVersion } from "../../progress/compute.js";
import type {
  ActivePatientRecord,
  AppointmentRecord,
  DoneActivityRecord,
  EnrollmentRecord,
  PendingTaskRecord,
  PlanVersionRecord,
  SlotRecord,
} from "./repo.js";

/**
 * The six metric calculations (PRD section 10, DR-002 N). Each takes records already read and
 * returns the number, the denominator and every row of every drill-down list, so the number and
 * its lists come from one pass and cannot disagree. Pure: no database, no clock.
 */
export interface BuiltRow {
  row: MetricRow;
  /** The lists this row belongs to. */
  lists: string[];
  minutes?: number;
}

export interface Built {
  numerator: number;
  denominator: number | null;
  rows: BuiltRow[];
  breakdown: { key: string; label: string; count: number }[];
}

/** The role each list plays for its metric. */
export const listRoles: {
  [K in MetricKey]: Record<(typeof metricListKeys)[K][number], MetricListRole>;
} = {
  enrollment_completion: {
    not_submitted: "remainder",
    submitted: "numerator",
    created: "denominator",
  },
  appointment_utilisation: { unbooked: "remainder", booked: "numerator", published: "denominator" },
  cancellations: {
    cancelled: "numerator",
    cancelled_by_patient: "breakdown",
    cancelled_by_clinic: "breakdown",
    booked: "denominator",
  },
  care_plan_activation: {
    without_plan: "remainder",
    with_plan: "numerator",
    active: "denominator",
  },
  activity_completion: {
    not_done: "remainder",
    done: "numerator",
    scheduled: "denominator",
    by_patient: "breakdown",
  },
  pending_review_items: {
    all: "numerator",
    under_24h: "breakdown",
    "24_to_48h": "breakdown",
    over_48h: "breakdown",
  },
};

const DAY = 86_400_000;
const HOUR = 3_600_000;
const wholeDaysSince = (from: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - from.getTime()) / DAY));

export function buildEnrollment(records: EnrollmentRecord[], now: Date): Built {
  const rows: BuiltRow[] = [];
  let submitted = 0;
  for (const r of records) {
    const done = r.intakeStatus === "submitted" || r.intakeStatus === "reviewed";
    if (done) submitted += 1;
    rows.push({
      lists: ["created", done ? "submitted" : "not_submitted"],
      row: {
        kind: "enrollment",
        patientId: r.patientId,
        name: r.name,
        createdAt: r.createdAt.toISOString(),
        daysSinceSignUp: wholeDaysSince(r.createdAt, now),
        intakeStatus: r.intakeStatus,
        intakeStep: r.intakeStep,
        submittedAt: r.submittedAt?.toISOString() ?? null,
      },
    });
  }
  return { numerator: submitted, denominator: records.length, rows, breakdown: [] };
}

export function buildUtilisation(records: SlotRecord[]): Built {
  const rows: BuiltRow[] = [];
  let used = 0;
  let published = 0;
  for (const s of records) {
    const minutes = Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000);
    published += minutes;
    const booked = s.appointment !== null;
    if (booked) used += minutes;
    rows.push({
      minutes,
      lists: ["published", booked ? "booked" : "unbooked"],
      row: {
        kind: "slot",
        slotId: s.slotId,
        practitioner: s.practitioner,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        minutes,
        slotStatus: s.slotStatus,
        appointmentId: s.appointment?.id ?? null,
        appointmentStatus: s.appointment?.status ?? null,
        patient: s.appointment?.patient ?? null,
      },
    });
  }
  return { numerator: used, denominator: published, rows, breakdown: [] };
}

export function buildCancellations(records: AppointmentRecord[]): Built {
  const rows: BuiltRow[] = [];
  let cancelled = 0;
  let byPatient = 0;
  let byClinic = 0;
  let moved = 0;
  for (const a of records) {
    const who =
      a.status === "cancelled_by_patient"
        ? "patient"
        : a.status === "cancelled_by_clinic"
          ? "clinic"
          : null;
    const lists = ["booked"];
    if (who) {
      cancelled += 1;
      lists.push("cancelled", who === "patient" ? "cancelled_by_patient" : "cancelled_by_clinic");
      if (who === "patient") byPatient += 1;
      else byClinic += 1;
      if (a.moved) moved += 1;
    }
    rows.push({
      lists,
      row: {
        kind: "appointment",
        appointmentId: a.appointmentId,
        patient: a.patient,
        practitioner: a.practitioner,
        type: a.type,
        status: a.status,
        startsAt: a.startsAt.toISOString(),
        bookedAt: a.bookedAt.toISOString(),
        cancelledAt: a.cancelledAt?.toISOString() ?? null,
        cancelledBy: who,
        cancellationReason: who ? a.cancellationReason : null,
        movedToNewTime: who ? a.moved : false,
      },
    });
  }
  return {
    numerator: cancelled,
    denominator: records.length,
    rows,
    breakdown: [
      { key: "by_patient", label: "Cancelled by the patient", count: byPatient },
      { key: "by_clinic", label: "Cancelled by the clinic", count: byClinic },
      { key: "moved_to_new_time", label: "Cancelled to move to another time", count: moved },
    ],
  };
}

export function buildCarePlan(records: ActivePatientRecord[], now: Date): Built {
  const rows: BuiltRow[] = [];
  let withPlan = 0;
  for (const p of records) {
    const published = p.planStage === "published";
    if (published) withPlan += 1;
    rows.push({
      lists: ["active", published ? "with_plan" : "without_plan"],
      row: {
        kind: "plan",
        patientId: p.patientId,
        name: p.name,
        planStage: p.planStage,
        clinicians: p.clinicians,
        assignedSince: p.assignedSince?.toISOString() ?? null,
        daysSinceAssigned: p.assignedSince ? wholeDaysSince(p.assignedSince, now) : null,
      },
    });
  }
  return { numerator: withPlan, denominator: records.length, rows, breakdown: [] };
}

type VersionWithSchedule = PlanVersionRecord & ScheduleVersion;

/**
 * Activity items: for every clinic-zone day from the day of `from` while the day starts before
 * `to`, each exercise of the plan version in force that is scheduled that weekday counts
 * `timesPerDay` items. A completed activity of the same exercise on the same day makes one item
 * done, up to the times per day. Activities on unscheduled days make nothing done.
 */
export function buildActivity(
  versions: PlanVersionRecord[],
  done: DoneActivityRecord[],
  window: { from: Date; to: Date },
  timeZone: string,
): Built {
  const byPatient = new Map<string, { name: string; versions: VersionWithSchedule[] }>();
  for (const v of versions) {
    const entry = byPatient.get(v.patientId) ?? { name: v.patientName, versions: [] };
    entry.versions.push(v);
    byPatient.set(v.patientId, entry);
  }
  const pool = new Map<string, number>();
  for (const d of done) {
    const key = `${d.patientId}|${localDate(d.completedAt, timeZone)}|${d.exerciseId}`;
    pool.set(key, (pool.get(key) ?? 0) + 1);
  }
  const days: string[] = [];
  for (
    let d = localDate(window.from, timeZone);
    startOfLocalDay(d, timeZone) < window.to;
    d = addDays(d, 1)
  ) {
    days.push(d);
  }

  const itemRows: BuiltRow[] = [];
  const summary: BuiltRow[] = [];
  let doneTotal = 0;
  for (const [patientId, entry] of byPatient) {
    let scheduled = 0;
    let doneCount = 0;
    for (const date of days) {
      const version = versionOn(date, timeZone, entry.versions) as VersionWithSchedule | null;
      if (!version) continue;
      const dow = weekday(date);
      for (const a of [...version.assignments].sort((x, y) => x.position - y.position)) {
        if (!a.daysOfWeek.includes(dow)) continue;
        const key = `${patientId}|${date}|${a.exerciseId}`;
        for (let i = 1; i <= a.timesPerDay; i++) {
          const left = pool.get(key) ?? 0;
          const isDone = left > 0;
          if (isDone) pool.set(key, left - 1);
          scheduled += 1;
          if (isDone) doneCount += 1;
          itemRows.push({
            lists: ["scheduled", isDone ? "done" : "not_done"],
            row: {
              kind: "item",
              patientId,
              name: entry.name,
              date,
              itemNumber: a.position + 1,
              instance: i,
              done: isDone,
            },
          });
        }
      }
    }
    doneTotal += doneCount;
    if (scheduled > 0) {
      summary.push({
        lists: ["by_patient"],
        row: { kind: "patient_items", patientId, name: entry.name, scheduled, done: doneCount },
      });
    }
  }
  type Item = Extract<MetricRow, { kind: "item" }>;
  type Sum = Extract<MetricRow, { kind: "patient_items" }>;
  itemRows.sort((a, b) => {
    const x = a.row as Item;
    const y = b.row as Item;
    return (
      y.date.localeCompare(x.date) ||
      x.name.localeCompare(y.name) ||
      x.patientId.localeCompare(y.patientId) ||
      x.itemNumber - y.itemNumber ||
      x.instance - y.instance
    );
  });
  // Lowest share done first; equal shares by name.
  summary.sort((a, b) => {
    const x = a.row as Sum;
    const y = b.row as Sum;
    return (
      x.done / x.scheduled - y.done / y.scheduled ||
      x.name.localeCompare(y.name) ||
      x.patientId.localeCompare(y.patientId)
    );
  });
  return {
    numerator: doneTotal,
    denominator: itemRows.length,
    rows: [...itemRows, ...summary],
    breakdown: [],
  };
}

export function reviewBandOf(ageHours: number): ReviewBand {
  if (ageHours < 24) return "under_24h";
  if (ageHours < 48) return "24_to_48h";
  return "over_48h";
}

export function buildPendingReview(records: PendingTaskRecord[], now: Date): Built {
  const rows: BuiltRow[] = records.map((t) => {
    const ageHours = Math.max(0, Math.floor((now.getTime() - t.createdAt.getTime()) / HOUR));
    const band = reviewBandOf(ageHours);
    return {
      lists: ["all", band],
      row: {
        kind: "review_task",
        taskId: t.taskId,
        patientId: t.patientId,
        name: t.patientName,
        ruleName: t.ruleName,
        status: t.status,
        priorityLevel: priorityLevelOf(t.priority),
        createdAt: t.createdAt.toISOString(),
        ageHours,
        band,
        assignedTo: t.assignedTo,
      },
    };
  });
  return { numerator: records.length, denominator: null, rows, breakdown: [] };
}
