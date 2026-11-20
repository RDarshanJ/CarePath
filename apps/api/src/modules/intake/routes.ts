import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  CONSENT_TEXT_VERSIONS,
  INTAKE_TOTAL_STEPS,
  intakeAnswerSchemas,
  intakeStateSchema,
  intakeStepNumber,
  intakeSteps,
  intakeStepParamsSchema,
  intakeStepSaveSchema,
  intakeSubmitRequestSchema,
  patientIdParamsSchema,
  type IntakeAnswers,
  type IntakeState,
} from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { withTx, type TxScope } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import {
  recordPhiRead,
  requirePatientRead,
  requirePatientWrite,
} from "../../core/scope/patient-scope.js";
import { findActiveConsent, grantConsent, revokeConsent } from "../consents/repo.js";
import { asAnswers, missingSteps, stepComplete } from "./completeness.js";
import {
  findIntake,
  lockIntake,
  saveIntakeStep,
  setPatientStatus,
  submitIntake,
  updatePatientDemographics,
} from "./repo.js";

/**
 * Onboarding intake (Scenario A): autosave per step, resume at the first incomplete step on any
 * device (AC-A1), submit moves the patient to awaiting assignment (AC-A2). Coordinators and
 * admins see completeness only (C1 ruling 3.7).
 */
type IntakeRow = NonNullable<Awaited<ReturnType<typeof findIntake>>>;

async function stateOf(
  db: DbClient,
  ctx: RequestCtx,
  patientId: string,
  row: IntakeRow,
  full: boolean,
): Promise<IntakeState> {
  const answers = asAnswers(row.answers);
  const consentActive =
    (await findActiveConsent(db, ctx, patientId, "treatment_and_data_use")) !== null;
  const steps = intakeSteps.map((step) => ({
    step,
    number: intakeStepNumber(step),
    complete:
      step === "review" ? row.status !== "in_progress" : stepComplete(step, answers, consentActive),
    answers: full && answers[step] !== undefined ? asAnswers(answers[step]) : null,
  }));
  return {
    view: full ? "full" : "completeness",
    status: row.status,
    currentStep: intakeSteps.includes(row.currentStep as never)
      ? (row.currentStep as IntakeState["currentStep"])
      : "personal_information",
    firstIncompleteStep: steps.find((s) => !s.complete)?.step ?? null,
    totalSteps: INTAKE_TOTAL_STEPS,
    steps,
    missing: missingSteps(answers, consentActive),
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? null,
  };
}

/** The consent step's choices become Consent rows in the same transaction, audited. */
async function applyConsentStep(
  scope: TxScope,
  ctx: RequestCtx,
  patientId: string,
  answers: IntakeAnswers["consent"],
  now: Date,
) {
  const { tx, audit } = scope;
  const grant = async (type: "treatment_and_data_use" | "ai_assisted_features") => {
    if (await findActiveConsent(tx, ctx, patientId, type)) return;
    const row = await grantConsent(tx, ctx, { patientId, type, userId: ctx.userId, now });
    await audit({
      eventName: "consent.grant",
      action: "C",
      outcome: "success",
      resourceType: "Consent",
      resourceId: row.id,
      patientId,
      purposeOfUse: "patient_access",
      metadata: { type, textVersion: answers.textVersion },
    });
  };
  await grant("treatment_and_data_use");
  if (answers.aiAssistedFeatures) {
    await grant("ai_assisted_features");
  } else {
    const active = await findActiveConsent(tx, ctx, patientId, "ai_assisted_features");
    if (active && (await revokeConsent(tx, ctx, patientId, active.id, now))) {
      await audit({
        eventName: "consent.revoke",
        action: "U",
        outcome: "success",
        resourceType: "Consent",
        resourceId: active.id,
        patientId,
        purposeOfUse: "patient_access",
        metadata: { type: "ai_assisted_features" },
      });
    }
  }
}

export const intakeRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/patients/:patientId/intake",
    {
      config: {
        access: { permission: ["patient.read_own", "clinical.read", "enrollment.manage"] },
      },
      schema: {
        operationId: "getIntake",
        tags: ["onboarding"],
        summary:
          "Intake steps with answers and where to resume; completeness only for coordinators and admins.",
        params: patientIdParamsSchema,
        response: { 200: intakeStateSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const row = await findIntake(db, ctx, patientId);
      if (!row) throw new AppError("not_found");
      const full = ctx.role === "patient" || ctx.permissions.has("clinical.read");
      if (full) await recordPhiRead(request, patientId, "IntakeAssessment", row.id);
      return stateOf(db, ctx, patientId, row, full);
    },
  );

  app.put(
    "/patients/:patientId/intake/steps/:step",
    {
      config: { access: { permission: "patient.update_own" } },
      schema: {
        operationId: "saveIntakeStep",
        tags: ["onboarding"],
        summary: "Autosave one step's answers. Saving the consent step records the consents.",
        params: intakeStepParamsSchema,
        body: intakeStepSaveSchema,
        response: { 200: intakeStateSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { patientId, step } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      const parsed = intakeAnswerSchemas[step].safeParse(request.body.answers);
      if (!parsed.success) {
        throw new AppError(
          "validation_error",
          parsed.error.issues.map((i) => ({
            path: ["body", "answers", ...i.path.map(String)].join("."),
            issue: i.code,
            message: i.message,
          })),
        );
      }
      if (step === "consent") {
        const v = (parsed.data as IntakeAnswers["consent"]).textVersion;
        if (v !== CONSENT_TEXT_VERSIONS.treatment_and_data_use) {
          throw new AppError("validation_error", [
            {
              path: "body.answers.textVersion",
              issue: "outdated_text",
              message: "Show the current consent text.",
            },
          ]);
        }
      }
      return withTx(request, async (scope) => {
        const { tx } = scope;
        const at = now();
        const row = await lockIntake(tx, ctx, patientId);
        if (!row) throw new AppError("not_found");
        if (row.status !== "in_progress") throw new AppError("invalid_transition");
        const answers = { ...asAnswers(row.answers), [step]: parsed.data };
        const extra: { reasonForCare?: string; bodyArea?: string; painScore?: number } = {};
        if (step === "primary_goal")
          extra.reasonForCare = (parsed.data as IntakeAnswers["primary_goal"]).goal;
        if (step === "body_area")
          extra.bodyArea = (parsed.data as IntakeAnswers["body_area"]).bodyArea;
        if (step === "pain_levels")
          extra.painScore = (parsed.data as IntakeAnswers["pain_levels"]).current;
        if (step === "personal_information") {
          await updatePatientDemographics(tx, ctx, patientId, {
            ...(parsed.data as IntakeAnswers["personal_information"]),
            now: at,
          });
        }
        if (step === "consent") {
          await applyConsentStep(
            scope,
            ctx,
            patientId,
            parsed.data as IntakeAnswers["consent"],
            at,
          );
        }
        await saveIntakeStep(tx, ctx, row.id, {
          currentStep: step,
          answers: answers as never,
          ...extra,
          now: at,
        });
        return stateOf(tx, ctx, patientId, (await findIntake(tx, ctx, patientId))!, true);
      });
    },
  );

  app.post(
    "/patients/:patientId/intake/submit",
    {
      config: { access: { permission: "patient.update_own" } },
      schema: {
        operationId: "submitIntake",
        tags: ["onboarding"],
        summary: "Submit the intake; the patient moves to awaiting assignment (AC-A2).",
        params: patientIdParamsSchema,
        body: intakeSubmitRequestSchema,
        response: { 200: intakeStateSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      return withTx(request, async ({ tx }) => {
        const at = now();
        const row = await lockIntake(tx, ctx, patientId);
        if (!row) throw new AppError("not_found");
        if (row.status !== "in_progress") throw new AppError("invalid_transition");
        const consentActive =
          (await findActiveConsent(tx, ctx, patientId, "treatment_and_data_use")) !== null;
        const missing = missingSteps(asAnswers(row.answers), consentActive);
        if (missing.length > 0) {
          throw new AppError(
            "intake_incomplete",
            missing.map((s) => ({
              path: s,
              issue: "incomplete",
              message: "This step is not complete.",
            })),
          );
        }
        await submitIntake(tx, ctx, row.id, at);
        if (
          !(await setPatientStatus(
            tx,
            ctx,
            patientId,
            "intake_incomplete",
            "awaiting_assignment",
            at,
          ))
        ) {
          throw new AppError("invalid_transition");
        }
        return stateOf(tx, ctx, patientId, (await findIntake(tx, ctx, patientId))!, true);
      });
    },
  );
};
