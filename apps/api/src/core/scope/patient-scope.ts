import type { FastifyRequest } from "fastify";
import { auditActionFor } from "../auth/access.js";
import { requireCtx, type RequestCtx } from "../context.js";
import { AppError } from "../errors.js";
import { findScopedPatientId, isOnCareTeam } from "./repo.js";

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
