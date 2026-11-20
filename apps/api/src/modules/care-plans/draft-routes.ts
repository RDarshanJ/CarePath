import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import {
  carePlanDraftContentSchema,
  carePlanDraftSaveSchema,
  carePlanDraftSchema,
  carePlanPublishRequestSchema,
  carePlanVersionDetailSchema,
  patientCarePlanSchema,
  patientIdParamsSchema,
  type CarePlanDraft,
  type CarePlanDraftContent,
  type ErrorDetail,
} from "@carepath/shared/contracts";
import { requireCtx, type RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, dbErrorToCode, errorResponses } from "../../core/errors.js";
import { practitionerRef } from "../../core/people.js";
import {
  recordPhiRead,
  requirePatientRead,
  requirePatientWrite,
} from "../../core/scope/patient-scope.js";
import { exercisesByIds, existingExerciseIds } from "../exercises/repo.js";
import {
  findOpenPlan,
  findVersion,
  insertPlan,
  insertVersion,
  lockOpenPlan,
  markPublished,
  nextVersionNumber,
  notifyPlanPublished,
  patientUserId,
  planGoalIds,
  practitionerById,
  saveDraft,
  syncGoals,
  toRenderItem,
} from "./repo.js";
import { renderCarePlanView, type PlanRenderItem } from "./serializer.js";
import { publishedView } from "./view.js";

/**
 * Plan builder (Scenario B, delivery step 4). The draft lives in CarePlan.draftContent as
 * `{ content, editedByPractitionerId }`; versions exist only once published (C1 ruling 3.7).
 * Autosave and publish lock the plan row and compare `expectedUpdatedAt` with the stored draft
 * time, so a stale editor gets 409 `draft_stale` instead of overwriting newer work.
 */
interface StoredDraft {
  content: CarePlanDraftContent;
  editedByPractitionerId: string;
}

function readDraft(raw: unknown): StoredDraft | null {
  if (raw === null || typeof raw !== "object") return null;
  const r = raw as { content?: unknown; editedByPractitionerId?: unknown };
  const content = carePlanDraftContentSchema.safeParse(r.content);
  if (!content.success || typeof r.editedByPractitionerId !== "string") {
    throw new Error("stored draft does not match CarePlanDraftContent");
  }
  return { content: content.data, editedByPractitionerId: r.editedByPractitionerId };
}

function sameInstant(a: Date | null, b: string | null): boolean {
  if (a === null || b === null) return a === null && b === null;
  return a.getTime() === Date.parse(b);
}

async function draftView(
  db: DbClient,
  ctx: RequestCtx,
  plan: { id: string; currentVersionId: string | null; draftUpdatedAt: Date | null },
  draft: StoredDraft,
  next: number,
): Promise<CarePlanDraft> {
  const author = await practitionerById(db, ctx, draft.editedByPractitionerId);
  if (!author) throw new Error("draft author is not a practitioner of the organization");
  return {
    carePlanId: plan.id,
    content: draft.content,
    updatedAt: (plan.draftUpdatedAt ?? new Date(0)).toISOString(),
    author: practitionerRef(author),
    nextVersionNumber: next,
    currentVersionId: plan.currentVersionId,
  };
}

/** Body ids (exercises, goals) must belong to the organization and the plan: 400 otherwise. */
async function validateReferences(
  db: DbClient,
  ctx: RequestCtx,
  content: CarePlanDraftContent,
  carePlanId: string | null,
): Promise<void> {
  const details: ErrorDetail[] = [];
  const exercises = await existingExerciseIds(
    db,
    ctx,
    content.items.map((i) => i.exerciseId),
  );
  content.items.forEach((item, i) => {
    if (!exercises.has(item.exerciseId)) {
      details.push({
        path: `body.items.${i}.exerciseId`,
        issue: "unknown_exercise",
        message: "Not an active exercise in this organization's library.",
      });
    }
  });
  const goals = carePlanId ? await planGoalIds(db, ctx, carePlanId) : new Set<string>();
  content.goals.forEach((g, i) => {
    if (g.id !== null && !goals.has(g.id)) {
      details.push({
        path: `body.goals.${i}.id`,
        issue: "unknown_goal",
        message: "Not a goal of this plan.",
      });
    }
  });
  if (details.length > 0) throw new AppError("validation_error", details);
}

async function draftItems(
  db: DbClient,
  ctx: RequestCtx,
  content: CarePlanDraftContent,
): Promise<PlanRenderItem[]> {
  const exercises = new Map(
    (
      await exercisesByIds(
        db,
        ctx,
        content.items.map((i) => i.exerciseId),
      )
    ).map((e) => [e.id, e]),
  );
  return content.items.map((i) => {
    const exercise = exercises.get(i.exerciseId);
    if (!exercise) throw new Error("draft references a missing exercise");
    return {
      assignmentId: null,
      position: i.position,
      exercise,
      dose: i.dose,
      schedule: i.schedule,
      clinicianInstructions: i.instructions,
    };
  });
}

export const carePlanDraftRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  async function clinicianWrite(request: FastifyRequest, patientId: string) {
    const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
    if (!ctx.practitionerId) throw new AppError("forbidden");
    return { ctx, practitionerId: ctx.practitionerId };
  }

  app.get(
    "/patients/:patientId/care-plan/draft",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "getCarePlanDraft",
        tags: ["care-plan"],
        summary: "The plan draft with its author and update time; 404 when there is no draft.",
        params: patientIdParamsSchema,
        response: { 200: carePlanDraftSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const plan = await findOpenPlan(db, ctx, patientId);
      const draft = plan ? readDraft(plan.draftContent) : null;
      if (!plan || !draft) throw new AppError("not_found");
      await recordPhiRead(request, patientId, "CarePlan", plan.id);
      return draftView(db, ctx, plan, draft, await nextVersionNumber(db, ctx, plan.id));
    },
  );

  app.put(
    "/patients/:patientId/care-plan/draft",
    {
      config: { access: { permission: "clinical.write" } },
      schema: {
        operationId: "saveCarePlanDraft",
        tags: ["care-plan"],
        summary:
          "Autosave the draft (care team only). Creates the plan in draft status when none exists.",
        params: patientIdParamsSchema,
        body: carePlanDraftSaveSchema,
        response: { 200: carePlanDraftSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const { ctx, practitionerId } = await clinicianWrite(request, patientId);
      const { expectedUpdatedAt, ...content } = request.body;
      try {
        return await withTx(request, async ({ tx }) => {
          const at = now();
          let plan = await lockOpenPlan(tx, ctx, patientId);
          await validateReferences(tx, ctx, content, plan?.id ?? null);
          if (!plan) {
            if (expectedUpdatedAt !== null) throw new AppError("draft_stale");
            await insertPlan(tx, ctx, { patientId, title: content.title, practitionerId, now: at });
            plan = await findOpenPlan(tx, ctx, patientId);
            if (!plan) throw new Error("plan vanished inside its transaction");
          } else if (!sameInstant(plan.draftUpdatedAt, expectedUpdatedAt)) {
            throw new AppError("draft_stale");
          }
          const stored: StoredDraft = { content, editedByPractitionerId: practitionerId };
          await saveDraft(tx, ctx, plan.id, stored as never, at);
          return draftView(
            tx,
            ctx,
            { ...plan, draftUpdatedAt: at },
            stored,
            await nextVersionNumber(tx, ctx, plan.id),
          );
        });
      } catch (err) {
        // Two first saves at once: the one-open-plan index rejects the second.
        if (dbErrorToCode(err) === "already_exists") throw new AppError("draft_stale");
        throw err;
      }
    },
  );

  app.get(
    "/patients/:patientId/care-plan/draft/preview",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "previewCarePlanDraft",
        tags: ["care-plan"],
        summary:
          "The draft rendered through the patient plan serializer (REQ-PLN-05), with the diff from the current version.",
        params: patientIdParamsSchema,
        response: { 200: patientCarePlanSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const plan = await findOpenPlan(db, ctx, patientId);
      const draft = plan ? readDraft(plan.draftContent) : null;
      if (!plan || !draft) throw new AppError("not_found");
      const author = await practitionerById(db, ctx, draft.editedByPractitionerId);
      if (!author) throw new Error("draft author is not a practitioner of the organization");
      const current = plan.currentVersionId
        ? await findVersion(db, ctx, patientId, plan.currentVersionId)
        : null;
      await recordPhiRead(request, patientId, "CarePlan", plan.id);
      return {
        plan: renderCarePlanView({
          carePlanId: plan.id,
          preview: true,
          title: draft.content.title,
          instructions: draft.content.instructions,
          version: {
            id: null,
            number: await nextVersionNumber(db, ctx, plan.id),
            publishedAt: null,
            publishedBy: practitionerRef(author),
            changeNoteForPatient: null,
            isCurrent: false,
          },
          items: await draftItems(db, ctx, draft.content),
          goals: draft.content.goals,
          previous: current
            ? { number: current.versionNumber, items: current.assignments.map(toRenderItem) }
            : null,
        }),
      };
    },
  );

  app.post(
    "/patients/:patientId/care-plan/publish",
    {
      config: { access: { permission: "careplan.publish" } },
      schema: {
        operationId: "publishCarePlan",
        tags: ["care-plan"],
        summary:
          "Publish the draft as the next immutable version (care team only). A change note is required from version 2.",
        params: patientIdParamsSchema,
        body: carePlanPublishRequestSchema,
        response: {
          201: carePlanVersionDetailSchema,
          ...errorResponses(400, 401, 403, 404, 409, 429),
        },
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;
      const { ctx, practitionerId } = await clinicianWrite(request, patientId);
      const note = request.body.changeNoteForPatient?.trim() || null;
      const view = await withTx(request, async ({ tx, audit }) => {
        const at = now();
        const plan = await lockOpenPlan(tx, ctx, patientId);
        if (!plan) throw new AppError("not_found");
        const draft = readDraft(plan.draftContent);
        // No draft any more (a concurrent publish consumed it) or a newer one: stale.
        if (!draft || !sameInstant(plan.draftUpdatedAt, request.body.expectedUpdatedAt)) {
          throw new AppError("draft_stale");
        }
        const number = await nextVersionNumber(tx, ctx, plan.id);
        const problems: ErrorDetail[] = [];
        if (number >= 2 && note === null) {
          problems.push({
            path: "body.changeNoteForPatient",
            issue: "required",
            message: "Explain the change for the patient. Required from version 2.",
          });
        }
        if (draft.content.items.length === 0) {
          problems.push({
            path: "draft.items",
            issue: "empty",
            message: "Add at least one exercise.",
          });
        }
        if (problems.length > 0) throw new AppError("validation_error", problems);
        await validateReferences(tx, ctx, draft.content, plan.id);

        const versionId = await insertVersion(tx, ctx, {
          carePlanId: plan.id,
          versionNumber: number,
          title: draft.content.title,
          instructions: draft.content.instructions,
          changeNoteForPatient: note,
          practitionerId,
          now: at,
          assignments: draft.content.items.map((i) => ({
            exerciseId: i.exerciseId,
            position: i.position,
            ...i.dose,
            daysOfWeek: i.schedule.daysOfWeek,
            timesPerDay: i.schedule.timesPerDay,
            instructions: i.instructions,
          })),
        });
        await markPublished(tx, ctx, plan.id, {
          versionId,
          title: draft.content.title,
          activate: plan.status === "draft",
          now: at,
        });
        await syncGoals(tx, ctx, {
          patientId,
          carePlanId: plan.id,
          goals: draft.content.goals,
          now: at,
        });
        const userId = await patientUserId(tx, ctx, patientId);
        if (userId) {
          await notifyPlanPublished(tx, ctx, {
            userId,
            versionId,
            versionNumber: number,
            note,
            title: draft.content.title,
            now: at,
          });
        }
        await audit({
          eventName: "careplan.publish",
          action: "C",
          outcome: "success",
          resourceType: "CarePlanVersion",
          resourceId: versionId,
          patientId,
          purposeOfUse: "treatment",
          metadata: { versionNumber: number },
        });
        const version = await findVersion(tx, ctx, patientId, versionId);
        if (!version) throw new Error("version vanished inside its transaction");
        return publishedView(tx, requireCtx(request.ctx), patientId, version);
      });
      return reply.code(201).send(view);
    },
  );
};
