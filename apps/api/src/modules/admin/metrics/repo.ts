import type { AppointmentStatus, AppointmentType } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../../core/context.js";
import type { DbClient } from "../../../core/db/repo.js";
import { practitionerName } from "../../../core/people.js";

/**
 * Reads behind the six metrics (WP 6.1, CR-13). Every query filters on the organization. They
 * select counts-level facts only: names for the drill-down rows, never pain values, notes, plan
 * contents or review explanations.
 */
type Scope = Pick<RequestCtx, "orgId">;

/** A half-open window [from, to), or [from, to] when `inclusive` (the current window, ending now). */
export interface Span {
  from: Date;
  to: Date;
  inclusive: boolean;
}

const upTo = (s: Span) => (s.inclusive ? { lte: s.to } : { lt: s.to });
const fullName = (p: { givenName: string; familyName: string }) => `${p.givenName} ${p.familyName}`;

// ---- enrollment ------------------------------------------------------------------------------

export interface EnrollmentRecord {
  patientId: string;
  name: string;
  createdAt: Date;
  intakeStatus: "in_progress" | "submitted" | "reviewed" | null;
  intakeStep: string | null;
  submittedAt: Date | null;
}

export async function loadEnrollment(
  db: DbClient,
  scope: Scope,
  span: Span,
): Promise<EnrollmentRecord[]> {
  const rows = await db.patient.findMany({
    where: { organizationId: scope.orgId, createdAt: { gte: span.from, ...upTo(span) } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      givenName: true,
      familyName: true,
      createdAt: true,
      intakeAssessments: {
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        select: { status: true, currentStep: true, submittedAt: true },
      },
    },
  });
  return rows.map((r) => {
    // A submitted intake wins over a later one still in progress.
    const submitted = r.intakeAssessments.find((i) => i.status !== "in_progress");
    const chosen = submitted ?? r.intakeAssessments[0] ?? null;
    return {
      patientId: r.id,
      name: fullName(r),
      createdAt: r.createdAt,
      intakeStatus: chosen?.status ?? null,
      intakeStep: chosen?.currentStep ?? null,
      submittedAt: submitted?.submittedAt ?? null,
    };
  });
}

// ---- utilisation -----------------------------------------------------------------------------

/** Appointment statuses that use a slot's minutes. */
export const usingStatuses: AppointmentStatus[] = [
  "booked",
  "checked_in",
  "in_progress",
  "completed",
];

export interface SlotRecord {
  slotId: string;
  practitioner: { userId: string | null; practitionerId: string; name: string };
  startsAt: Date;
  endsAt: Date;
  slotStatus: "open" | "booked";
  appointment: {
    id: string;
    status: AppointmentStatus;
    patient: { id: string; name: string };
  } | null;
}

/** Published (open or booked) slots that started in the window, each with the visit using it. */
export async function loadSlots(db: DbClient, scope: Scope, span: Span): Promise<SlotRecord[]> {
  const rows = await db.availabilitySlot.findMany({
    where: {
      organizationId: scope.orgId,
      status: { in: ["open", "booked"] },
      startsAt: { gte: span.from, ...(span.inclusive ? { lte: span.to } : { lt: span.to }) },
    },
    orderBy: [{ startsAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      practitioner: {
        select: { id: true, userId: true, givenName: true, familyName: true, credentials: true },
      },
      appointments: {
        where: { status: { in: usingStatuses } },
        take: 1,
        select: {
          id: true,
          status: true,
          patient: { select: { id: true, givenName: true, familyName: true } },
        },
      },
    },
  });
  return rows.map((r) => {
    const a = r.appointments[0];
    return {
      slotId: r.id,
      practitioner: {
        userId: r.practitioner.userId,
        practitionerId: r.practitioner.id,
        name: practitionerName(r.practitioner),
      },
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      slotStatus: r.status === "booked" ? "booked" : "open",
      appointment: a
        ? { id: a.id, status: a.status, patient: { id: a.patient.id, name: fullName(a.patient) } }
        : null,
    };
  });
}

// ---- cancellations ---------------------------------------------------------------------------

export interface AppointmentRecord {
  appointmentId: string;
  patient: { id: string; name: string };
  practitioner: { userId: string | null; practitionerId: string; name: string };
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: Date;
  bookedAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  moved: boolean;
}

export async function loadBookedAppointments(
  db: DbClient,
  scope: Scope,
  span: Span,
): Promise<AppointmentRecord[]> {
  const rows = await db.appointment.findMany({
    where: { organizationId: scope.orgId, createdAt: { gte: span.from, ...upTo(span) } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      type: true,
      status: true,
      startsAt: true,
      createdAt: true,
      cancelledAt: true,
      cancellationReason: true,
      patient: { select: { id: true, givenName: true, familyName: true } },
      practitioner: {
        select: { id: true, userId: true, givenName: true, familyName: true, credentials: true },
      },
      rescheduledTo: { select: { id: true } },
    },
  });
  return rows.map((r) => ({
    appointmentId: r.id,
    patient: { id: r.patient.id, name: fullName(r.patient) },
    practitioner: {
      userId: r.practitioner.userId,
      practitionerId: r.practitioner.id,
      name: practitionerName(r.practitioner),
    },
    type: r.type,
    status: r.status,
    startsAt: r.startsAt,
    bookedAt: r.createdAt,
    cancelledAt: r.cancelledAt,
    cancellationReason: r.cancellationReason,
    moved: r.rescheduledTo !== null,
  }));
}

// ---- care plan activation --------------------------------------------------------------------

export interface ActivePatientRecord {
  patientId: string;
  name: string;
  planStage: "none" | "draft" | "published";
  clinicians: string[];
  assignedSince: Date | null;
}

/** Same plan-stage rule as the patient directory: an open plan, published when it has a current version. */
export async function loadActivePatients(
  db: DbClient,
  scope: Scope,
): Promise<ActivePatientRecord[]> {
  const rows = await db.patient.findMany({
    where: { organizationId: scope.orgId, status: "active" },
    orderBy: [{ familyName: "asc" }, { givenName: "asc" }, { id: "asc" }],
    select: {
      id: true,
      givenName: true,
      familyName: true,
      carePlans: {
        where: { status: { in: ["draft", "active", "on_hold"] } },
        select: { currentVersionId: true },
      },
      careTeam: {
        select: {
          status: true,
          members: {
            where: { endedAt: null },
            orderBy: [{ startedAt: "asc" }, { id: "asc" }],
            select: {
              startedAt: true,
              membership: {
                select: {
                  practitioner: {
                    select: { givenName: true, familyName: true, credentials: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return rows.map((r) => {
    const members = r.careTeam && r.careTeam.status === "active" ? r.careTeam.members : [];
    const clinicians = members.flatMap((m) =>
      m.membership.practitioner ? [practitionerName(m.membership.practitioner)] : [],
    );
    const firstClinician = members.find((m) => m.membership.practitioner);
    const stage = r.carePlans.some((p) => p.currentVersionId !== null)
      ? "published"
      : r.carePlans.length > 0
        ? "draft"
        : "none";
    return {
      patientId: r.id,
      name: fullName(r),
      planStage: stage,
      clinicians,
      assignedSince: firstClinician?.startedAt ?? null,
    };
  });
}

// ---- activity completion ---------------------------------------------------------------------

export interface PlanVersionRecord {
  patientId: string;
  patientName: string;
  id: string;
  versionNumber: number;
  publishedAt: Date;
  assignments: {
    exerciseId: string;
    position: number;
    daysOfWeek: number[];
    timesPerDay: number;
  }[];
}

/** Published versions of open (active or on hold) care plans, published before `before`. */
export async function loadPlanVersions(
  db: DbClient,
  scope: Scope,
  before: Date,
): Promise<PlanVersionRecord[]> {
  const rows = await db.carePlanVersion.findMany({
    where: {
      organizationId: scope.orgId,
      publishedAt: { lt: before },
      carePlan: { status: { in: ["active", "on_hold"] } },
    },
    orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      versionNumber: true,
      publishedAt: true,
      carePlan: {
        select: { patient: { select: { id: true, givenName: true, familyName: true } } },
      },
      assignments: {
        select: { exerciseId: true, position: true, daysOfWeek: true, timesPerDay: true },
      },
    },
  });
  return rows.map((r) => ({
    patientId: r.carePlan.patient.id,
    patientName: fullName(r.carePlan.patient),
    id: r.id,
    versionNumber: r.versionNumber,
    publishedAt: r.publishedAt,
    assignments: r.assignments,
  }));
}

export interface DoneActivityRecord {
  patientId: string;
  exerciseId: string;
  completedAt: Date;
}

/** Completed activities with a completion time in [from, to). */
export async function loadDoneActivities(
  db: DbClient,
  scope: Scope,
  from: Date,
  to: Date,
): Promise<DoneActivityRecord[]> {
  const rows = await db.sessionActivity.findMany({
    where: {
      organizationId: scope.orgId,
      status: "completed",
      completedAt: { gte: from, lt: to },
    },
    select: {
      completedAt: true,
      session: { select: { patientId: true } },
      assignment: { select: { exerciseId: true } },
    },
  });
  return rows.flatMap((r) =>
    r.completedAt
      ? [
          {
            patientId: r.session.patientId,
            exerciseId: r.assignment.exerciseId,
            completedAt: r.completedAt,
          },
        ]
      : [],
  );
}

// ---- pending review --------------------------------------------------------------------------

export interface PendingTaskRecord {
  taskId: string;
  patientId: string;
  patientName: string;
  ruleName: string;
  status: "open" | "in_review";
  priority: number;
  createdAt: Date;
  assignedTo: string | null;
}

export async function loadPendingTasks(db: DbClient, scope: Scope): Promise<PendingTaskRecord[]> {
  const rows = await db.reviewTask.findMany({
    where: { organizationId: scope.orgId, status: { in: ["open", "in_review"] } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      status: true,
      priority: true,
      createdAt: true,
      patient: { select: { id: true, givenName: true, familyName: true } },
      rule: { select: { name: true } },
      assignedTo: { select: { givenName: true, familyName: true, credentials: true } },
    },
  });
  return rows.map((r) => ({
    taskId: r.id,
    patientId: r.patient.id,
    patientName: fullName(r.patient),
    ruleName: r.rule.name,
    status: r.status === "in_review" ? "in_review" : "open",
    priority: r.priority,
    createdAt: r.createdAt,
    assignedTo: r.assignedTo ? practitionerName(r.assignedTo) : null,
  }));
}
