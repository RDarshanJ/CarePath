import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { CARE_TEAM_THREAD_SUBJECT } from "@carepath/shared";
import {
  assignClinicianRequestSchema,
  careTeamCardSchema,
  patientIdParamsSchema,
  practitionerListSchema,
  type CareTeamCard,
} from "@carepath/shared/contracts";
import { requireCtx, type RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { practitionerName } from "../../core/people.js";
import { requirePatientRead } from "../../core/scope/patient-scope.js";
import { setPatientStatus } from "../intake/repo.js";
import {
  addPrimaryTherapist,
  ensureCareTeamConversation,
  assignablePractitioner,
  careTeamMembers,
  practitionersWithCaseload,
} from "./repo.js";

/** Care team card (AC-H1) and clinician assignment (REQ-ADM-02, delivery step 6). */
const roleLabels = {
  primary_therapist: "Physical therapist",
  therapist: "Physical therapist",
  care_coordinator: "Care coordinator",
} as const;

async function card(db: DbClient, ctx: RequestCtx, patientId: string): Promise<CareTeamCard> {
  const rows = await careTeamMembers(db, ctx, patientId);
  return {
    patientId,
    members: rows.map((m) => {
      const p = m.membership.practitioner;
      return {
        userId: m.userId,
        practitionerId: p?.id ?? null,
        name: p ? `${p.givenName} ${p.familyName}` : m.membership.user.displayName,
        credentials: p?.credentials ?? null,
        role: m.role,
        roleLabel: roleLabels[m.role],
        since: m.startedAt.toISOString(),
      };
    }),
  };
}

export const careTeamRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/practitioners",
    {
      config: { access: { permission: ["assignment.manage", "patient.read"] } },
      schema: {
        operationId: "listPractitioners",
        tags: ["care-team"],
        summary: "Active practitioners with their active caseload, for assignment.",
        response: { 200: practitionerListSchema, ...errorResponses(401, 403, 429) },
      },
    },
    async (request) => {
      const ctx = requireCtx(request.ctx);
      const rows = await practitionersWithCaseload(db, ctx);
      return {
        items: rows.map((p) => ({
          id: p.id,
          userId: p.userId,
          name: practitionerName({ givenName: p.givenName, familyName: p.familyName }),
          credentials: p.credentials,
          activeCaseload: p.activeCaseload,
        })),
      };
    },
  );

  app.get(
    "/patients/:patientId/care-team",
    {
      config: { access: { permission: ["patient.read_own", "patient.read"] } },
      schema: {
        operationId: "getCareTeam",
        tags: ["care-team"],
        summary: "The patient's care team with names and roles.",
        params: patientIdParamsSchema,
        response: { 200: careTeamCardSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      return card(db, ctx, patientId);
    },
  );

  app.post(
    "/patients/:patientId/care-team/assignments",
    {
      config: { access: { permission: "assignment.manage" } },
      schema: {
        operationId: "assignClinician",
        tags: ["care-team"],
        summary:
          "Assign a primary therapist; the patient moves from awaiting assignment to active.",
        params: patientIdParamsSchema,
        body: assignClinicianRequestSchema,
        response: { 200: careTeamCardSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const pr = await assignablePractitioner(db, ctx, request.body.practitionerId);
      if (!pr || !pr.userId) {
        throw new AppError("validation_error", [
          {
            path: "body.practitionerId",
            issue: "unknown_practitioner",
            message: "Not an active practitioner here.",
          },
        ]);
      }
      const userId = pr.userId;
      return withTx(request, async ({ tx, audit }) => {
        const at = now();
        // Only a patient awaiting assignment (intake submitted) can be assigned (AC-A4).
        if (!(await setPatientStatus(tx, ctx, patientId, "awaiting_assignment", "active", at))) {
          throw new AppError("invalid_transition");
        }
        const memberId = await addPrimaryTherapist(tx, ctx, { patientId, userId, now: at });
        // The patient-to-care-team thread, in the same transaction (WP 4.1 ruling).
        await ensureCareTeamConversation(tx, ctx, {
          patientId,
          therapistUserId: userId,
          subject: CARE_TEAM_THREAD_SUBJECT,
          now: at,
        });
        await audit({
          eventName: "assignment.create",
          action: "C",
          outcome: "success",
          resourceType: "CareTeamMember",
          resourceId: memberId,
          patientId,
          purposeOfUse: "operations",
          metadata: { practitionerId: pr.id },
        });
        return card(tx, ctx, patientId);
      });
    },
  );
};
