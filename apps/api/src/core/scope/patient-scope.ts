import type { FastifyRequest } from "fastify";
import { auditActionFor } from "../auth/access.js";
import { requireCtx, type RequestCtx } from "../context.js";
import { AppError } from "../errors.js";
import {
  activityInSession,
  childExists,
  findScopedPatientId,
  isOnCareTeam,
  ruleInOrg,
  type PatientChild,
} from "./repo.js";

/**
 * Patient-scoped access for route handlers. Every patient route calls one of these before
 * touching the record.
 *
 * - Out of scope (other organization, another patient's id, or no such id): 404 with the same
 *   body as a missing record (AC-I6), plus a `security.access_denied` event that records the
 *   requested id as resourceId. patientId stays empty because the id may belong to another
 *   organization (AC-I1, AC-I2, AC-I7).
 * - Clinical write by a clinician who is not on the care team: 403 `not_on_care_team` plus an
 *   event. The patient is readable to them, so 404 would be false (advisor plan revision 1).
 */
export async function requirePatientRead(
  request: FastifyRequest,
  patientId: string,
): Promise<RequestCtx> {
  const ctx = requireCtx(request.ctx);
  const { db, audit } = request.server.deps;
  const found = await findScopedPatientId(db, ctx, patientId);
  if (!found) {
    await audit.fromRequest(request, {
      eventName: "security.access_denied",
      action: auditActionFor(request.method),
      outcome: "minor_failure",
      resourceType: "Patient",
      resourceId: patientId,
      detailCode: "out_of_scope",
    });
    throw new AppError("not_found");
  }
  return ctx;
}

export interface PatientWriteOptions {
  /** Clinical writes (plans, goals, notes, AI): clinicians must be on the care team. */
  careTeamOnly: boolean;
}

export async function requirePatientWrite(
  request: FastifyRequest,
  patientId: string,
  options: PatientWriteOptions,
): Promise<RequestCtx> {
  const ctx = await requirePatientRead(request, patientId);
  if (options.careTeamOnly && ctx.role !== "patient") {
    const { db, audit } = request.server.deps;
    if (!(await isOnCareTeam(db, ctx, patientId))) {
      await audit.fromRequest(request, {
        eventName: "security.access_denied",
        action: auditActionFor(request.method),
        outcome: "minor_failure",
        resourceType: "Patient",
        resourceId: patientId,
        patientId,
        detailCode: "not_on_care_team",
      });
      throw new AppError("not_on_care_team");
    }
  }
  return ctx;
}

/** 404 with the byte-identical body plus a `security.access_denied` event naming the id. */
export async function denyOutOfScope(
  request: FastifyRequest,
  resourceType: string,
  resourceId: string,
  patientId: string | null,
): Promise<never> {
  await request.server.deps.audit.fromRequest(request, {
    eventName: "security.access_denied",
    action: auditActionFor(request.method),
    outcome: "minor_failure",
    resourceType,
    resourceId,
    patientId,
    detailCode: "out_of_scope",
  });
  throw new AppError("not_found");
}

/**
 * A child of a patient already in scope (session, check-in, task, plan version, consent). Looked
 * up through the parent; a child of another patient or organization answers like a missing one.
 */
export async function requireChild(
  request: FastifyRequest,
  kind: PatientChild,
  patientId: string,
  id: string,
): Promise<void> {
  const ctx = requireCtx(request.ctx);
  if (!(await childExists(request.server.deps.db, ctx, kind, patientId, id))) {
    await denyOutOfScope(request, kind, id, patientId);
  }
}

/** An activity of a session already checked with requireChild(..., "ExerciseSession", ...). */
export async function requireActivity(
  request: FastifyRequest,
  patientId: string,
  sessionId: string,
  activityId: string,
): Promise<void> {
  const ctx = requireCtx(request.ctx);
  if (!(await activityInSession(request.server.deps.db, ctx, sessionId, activityId))) {
    await denyOutOfScope(request, "SessionActivity", activityId, patientId);
  }
}

/** A review rule of the caller's organization. */
export async function requireRule(request: FastifyRequest, ruleId: string): Promise<RequestCtx> {
  const ctx = requireCtx(request.ctx);
  if (!(await ruleInOrg(request.server.deps.db, ctx, ruleId))) {
    await denyOutOfScope(request, "ReviewRule", ruleId, null);
  }
  return ctx;
}

const purposeByRole = {
  patient: "patient_access",
  physical_therapist: "treatment",
  care_coordinator: "operations",
  clinic_admin: "operations",
} as const;

/**
 * Every record open by staff is audited (PRD section 13, REQ-REC-02). Patients reading their own
 * record are not logged as `phi.read` unless `includePatient` is set (the header route does).
 */
export async function recordPhiRead(
  request: FastifyRequest,
  patientId: string,
  resourceType: string,
  resourceId: string,
  options: { includePatient?: boolean } = {},
): Promise<void> {
  const ctx = requireCtx(request.ctx);
  if (ctx.role === "patient" && !options.includePatient) return;
  await request.server.deps.audit.fromRequest(request, {
    eventName: "phi.read",
    action: "R",
    outcome: "success",
    resourceType,
    resourceId,
    patientId,
    purposeOfUse: purposeByRole[ctx.role],
  });
}
