import type { Prisma } from "@carepath/db/client";
import type { RequestCtx } from "../../core/context.js";
import type { Db, DbClient } from "../../core/db/repo.js";
import { patientScopeWhere } from "../../core/scope/repo.js";

/** Patient header: the persistent identity block shown on every record view. Scoped by ctx. */
export async function findPatientHeader(db: Db, ctx: RequestCtx, patientId: string) {
  const where = patientScopeWhere(ctx, patientId);
  if (!where) return null;
  return db.patient.findFirst({
    where,
    select: {
      id: true,
      mrn: true,
      givenName: true,
      familyName: true,
      birthDate: true,
      gender: true,
      status: true,
      timezone: true,
      preferredLanguage: true,
    },
  });
}

export interface DirectoryFilter {
  q?: string;
  status?: "intake_incomplete" | "awaiting_assignment" | "active" | "inactive" | "discharged";
  clinicianId?: string;
  lastActivityBefore?: string;
  hasUpcomingAppointment?: boolean;
  planStage?: "none" | "draft" | "published";
  hasOpenReview?: boolean;
  sort: "name" | "-name" | "lastActivity" | "-lastActivity" | "status" | "-status";
}

const openPlan = {
  status: { in: ["draft", "active", "on_hold"] as ("draft" | "active" | "on_hold")[] },
};
const upcomingStatuses: ("booked" | "checked_in")[] = ["booked", "checked_in"];
const activeTasks: ("open" | "in_review")[] = ["open", "in_review"];

function directoryWhere(ctx: RequestCtx, f: DirectoryFilter, now: Date): Prisma.PatientWhereInput {
  const and: Prisma.PatientWhereInput[] = [{ organizationId: ctx.orgId }];
  if (f.q) {
    and.push({
      OR: [
        { givenName: { contains: f.q, mode: "insensitive" } },
        { familyName: { contains: f.q, mode: "insensitive" } },
        { mrn: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.status) and.push({ status: f.status });
  if (f.clinicianId) {
    and.push({
      careTeam: {
        status: "active",
        members: { some: { endedAt: null, membership: { practitioner: { id: f.clinicianId } } } },
      },
    });
  }
  if (f.lastActivityBefore) {
    and.push({
      OR: [{ lastActivityAt: null }, { lastActivityAt: { lt: new Date(f.lastActivityBefore) } }],
    });
  }
  if (f.hasUpcomingAppointment !== undefined) {
    const upcoming = { startsAt: { gt: now }, status: { in: upcomingStatuses } };
    and.push(
      f.hasUpcomingAppointment
        ? { appointments: { some: upcoming } }
        : { appointments: { none: upcoming } },
    );
  }
  if (f.planStage === "none") and.push({ carePlans: { none: openPlan } });
  if (f.planStage === "draft") {
    and.push({ carePlans: { some: { ...openPlan, currentVersionId: null } } });
  }
  if (f.planStage === "published") {
    and.push({ carePlans: { some: { ...openPlan, currentVersionId: { not: null } } } });
  }
  if (f.hasOpenReview !== undefined) {
    const open = { status: { in: activeTasks } };
    and.push(f.hasOpenReview ? { reviewTasks: { some: open } } : { reviewTasks: { none: open } });
  }
  return { AND: and };
}

function directoryOrder(sort: DirectoryFilter["sort"]): Prisma.PatientOrderByWithRelationInput[] {
  const dir = sort.startsWith("-") ? "desc" : "asc";
  const key = sort.replace("-", "");
  if (key === "lastActivity") {
    return [{ lastActivityAt: { sort: dir, nulls: "last" } }, { id: "asc" }];
  }
  if (key === "status") return [{ status: dir }, { familyName: "asc" }, { id: "asc" }];
  return [{ familyName: dir }, { givenName: dir }, { id: "asc" }];
}

/** Directory page: filters and sort in SQL (REQ-DIR-01). */
export async function listDirectory(
  db: DbClient,
  ctx: RequestCtx,
  filter: DirectoryFilter,
  now: Date,
  offset: number,
  take: number,
) {
  return db.patient.findMany({
    where: directoryWhere(ctx, filter, now),
    orderBy: directoryOrder(filter.sort),
    skip: offset,
    take,
    select: {
      id: true,
      mrn: true,
      givenName: true,
      familyName: true,
      birthDate: true,
      status: true,
      lastActivityAt: true,
      createdAt: true,
      careTeam: {
        select: {
          status: true,
          members: {
            where: { endedAt: null, role: "primary_therapist" },
            select: {
              membership: {
                select: {
                  user: { select: { id: true, displayName: true } },
                  practitioner: {
                    select: {
                      id: true,
                      userId: true,
                      givenName: true,
                      familyName: true,
                      credentials: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      appointments: {
        where: { startsAt: { gt: now }, status: { in: upcomingStatuses } },
        orderBy: { startsAt: "asc" },
        take: 1,
        select: { startsAt: true },
      },
      carePlans: {
        where: openPlan,
        select: {
          currentVersionId: true,
          currentVersion: { select: { versionNumber: true } },
        },
      },
      intakeAssessments: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { status: true },
      },
      _count: { select: { reviewTasks: { where: { status: { in: activeTasks } } } } },
    },
  });
}
