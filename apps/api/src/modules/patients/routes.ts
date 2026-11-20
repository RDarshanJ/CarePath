import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  patientDirectoryPageSchema,
  patientDirectoryQuerySchema,
  patientHeaderSchema,
  patientIdParamsSchema,
  type PatientDirectoryPage,
} from "@carepath/shared/contracts";
import { requireCtx } from "../../core/context.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import { practitionerRef } from "../../core/people.js";
import { recordPhiRead, requirePatientRead } from "../../core/scope/patient-scope.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { isOnCareTeam } from "../../core/scope/repo.js";
import { countDirectory, findPatientHeader, listDirectory } from "./repo.js";

export const patientRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/patients",
    {
      config: { access: { permission: "patient.read" } },
      schema: {
        operationId: "listPatients",
        tags: ["patients"],
        summary:
          "Patient directory with search, filters and sort in SQL. Roles without clinical.read get administrative rows.",
        querystring: patientDirectoryQuerySchema,
        response: { 200: patientDirectoryPageSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request): Promise<PatientDirectoryPage> => {
      const ctx = requireCtx(request.ctx);
      const { cursor, limit, ...filter } = request.query;
      const offset = decodeCursor(cursor);
      const at = now();
      const rows = await listDirectory(db, ctx, filter, at, offset, limit + 1);
      const page = pageFrom(rows, offset, limit);
      const clinical = ctx.permissions.has("clinical.read");
      return {
        nextCursor: page.nextCursor,
        total: await countDirectory(db, ctx, filter, at),
        items: page.items.map((p) => {
          const primary = p.careTeam?.status === "active" ? p.careTeam.members[0] : undefined;
          const pr = primary?.membership.practitioner;
          const plan = p.carePlans[0];
          const base = {
            id: p.id,
            mrn: p.mrn,
            givenName: p.givenName,
            familyName: p.familyName,
            birthDate: p.birthDate.toISOString().slice(0, 10),
            status: p.status,
            primaryClinician: primary
              ? {
                  practitionerId: pr?.id ?? null,
                  userId: primary.membership.user.id,
                  name: pr ? practitionerRef(pr).name : primary.membership.user.displayName,
                }
              : null,
            lastActivityAt: p.lastActivityAt?.toISOString() ?? null,
            nextAppointmentAt: p.appointments[0]?.startsAt.toISOString() ?? null,
            planStage: !plan
              ? ("none" as const)
              : plan.currentVersionId
                ? ("published" as const)
                : ("draft" as const),
          };
          if (clinical) {
            return {
              view: "clinical" as const,
              ...base,
              currentVersionNumber: plan?.currentVersion?.versionNumber ?? null,
              openReviewCount: p._count.reviewTasks,
            };
          }
          const intakeStatus = p.intakeAssessments[0]?.status ?? "not_started";
          return {
            view: "administrative" as const,
            ...base,
            createdAt: p.createdAt.toISOString(),
            intakeStatus,
            missingIntake: intakeStatus === "not_started" || intakeStatus === "in_progress",
          };
        }),
      };
    },
  );

  app.get(
    "/patients/:patientId",
    {
      config: { access: { permission: ["patient.read", "patient.read_own"] } },
      schema: {
        operationId: "getPatientHeader",
        tags: ["patients"],
        summary: "Patient header. Opening it writes a phi.read audit event.",
        params: patientIdParamsSchema,
        response: { 200: patientHeaderSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const row = await findPatientHeader(db, ctx, patientId);
      if (!row) throw new AppError("not_found");
      // PRD section 13 and advisor plan revision 1: every record open is audited.
      await recordPhiRead(request, row.id, "Patient", row.id, { includePatient: true });
      // CR-2: only the clinical view says whether the caller is on the care team.
      const onCareTeam = ctx.permissions.has("clinical.read")
        ? await isOnCareTeam(db, ctx, patientId)
        : null;
      return { ...row, birthDate: row.birthDate.toISOString().slice(0, 10), onCareTeam };
    },
  );
};
