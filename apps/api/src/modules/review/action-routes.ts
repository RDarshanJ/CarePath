import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import {
  checkInIdParamsSchema,
  checkInReviewRequestSchema,
  checkInSchema,
  defaultReviewRuleParams,
  REVIEW_RULE_DEFAULTS_NOTICE,
  reviewRuleListSchema,
  reviewRuleParamsSchemas,
  reviewRuleSchema,
  reviewRuleUpdateSchema,
  reviewTaskAssignSchema,
  reviewTaskResolveSchema,
  reviewTaskSchema,
  ruleIdParamsSchema,
  taskIdParamsSchema,
  type ReviewRule,
} from "@carepath/shared/contracts";
import { auditActionFor } from "../../core/auth/access.js";
import type { Permission } from "../../core/authz/permissions.js";
import { requireCtx } from "../../core/context.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import {
  requireChild,
  requirePatientRead,
  requirePatientWrite,
  requireRule,
} from "../../core/scope/patient-scope.js";
import { findCheckIn, markReviewed } from "../check-ins/repo.js";
import {
  activePractitioner,
  closeTask,
  findRule,
  findTask,
  listRules,
  setTaskAssignee,
  updateRule,
} from "./repo.js";
import { isOnCareTeam } from "../../core/scope/repo.js";
import { isReviewRuleKey } from "./rules.js";
import { ruleKind, toReviewTask } from "./view.js";

/**
 * Review actions (delivery step 5): task assign, resolve and dismiss, check-in reviewed, and the
 * admin-editable rules (REQ-RVQ-01, REQ-RVQ-03).
 *
 * Who may close a task depends on its rule: clinical rules need review_task.resolve and a seat
 * on the patient's care team; administrative rules (follow-up, missing intake) need
 * review_task.resolve_admin (PRD section 9).
 */
type RuleRow = NonNullable<Awaited<ReturnType<typeof findRule>>>;

function toRule(row: RuleRow): ReviewRule {
  const key = isReviewRuleKey(row.key) ? row.key : "reported_pain";
  return {
    id: row.id,
    key,
    name: row.name,
    description: row.description,
    kind: ruleKind(row.key),
    enabled: row.enabled,
    priority: row.priority,
    params: row.params as Record<string, number>,
    defaultParams: defaultReviewRuleParams[key],
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const reviewActionRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now, audit } = app.deps;

  async function deny(request: FastifyRequest, permission: Permission): Promise<never> {
    await audit.fromRequest(request, {
      eventName: "security.access_denied",
      action: auditActionFor(request.method),
      outcome: "minor_failure",
      detailCode: "missing_permission",
      metadata: { permission },
    });
    throw new AppError("forbidden");
  }

  /** Scope plus the rule-dependent permission for closing or assigning a task. */
  async function taskScope(
    request: FastifyRequest,
    patientId: string,
    taskId: string,
    action: "assign" | "close",
  ) {
    const ctx = await requirePatientRead(request, patientId);
    await requireChild(request, "ReviewTask", patientId, taskId);
    const task = await findTask(db, ctx, patientId, taskId);
    if (!task) throw new AppError("not_found");
    const clinical = ruleKind(task.rule.key) === "clinical";
    if (action === "assign" || clinical) {
      if (!ctx.permissions.has("review_task.resolve")) await deny(request, "review_task.resolve");
      await requirePatientWrite(request, patientId, { careTeamOnly: true });
    } else if (!ctx.permissions.has("review_task.resolve_admin")) {
      await deny(request, "review_task.resolve_admin");
    }
    return { ctx, task };
  }

  app.post(
    "/patients/:patientId/review-tasks/:taskId/assign",
    {
      config: { access: { permission: "review_task.resolve" } },
      schema: {
        operationId: "assignReviewTask",
        tags: ["review"],
        summary:
          "Assign a task to a practitioner (in review) or unassign it (open). Care team only.",
        params: taskIdParamsSchema,
        body: reviewTaskAssignSchema,
        response: { 200: reviewTaskSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { patientId, taskId } = request.params;
      const { ctx } = await taskScope(request, patientId, taskId, "assign");
      const { practitionerId } = request.body;
      if (practitionerId && !(await activePractitioner(db, ctx, practitionerId))) {
        throw new AppError("validation_error", [
          {
            path: "body.practitionerId",
            issue: "unknown_practitioner",
            message: "Not an active practitioner here.",
          },
        ]);
      }
      return withTx(request, async ({ tx }) => {
        const at = now();
        if (!(await setTaskAssignee(tx, ctx, patientId, taskId, practitionerId, at))) {
          throw new AppError("invalid_transition");
        }
        const row = await findTask(tx, ctx, patientId, taskId);
        return toReviewTask(row!, at, await isOnCareTeam(tx, ctx, patientId));
      });
    },
  );

  for (const outcome of ["resolve", "dismiss"] as const) {
    app.post(
      `/patients/:patientId/review-tasks/:taskId/${outcome}`,
      {
        config: { access: { permission: ["review_task.resolve", "review_task.resolve_admin"] } },
        schema: {
          operationId: outcome === "resolve" ? "resolveReviewTask" : "dismissReviewTask",
          tags: ["review"],
          summary:
            outcome === "resolve"
              ? "Resolve a task with a note; it leaves the open queue and keeps its history (AC-D5)."
              : "Dismiss a task with a note (no action needed).",
          params: taskIdParamsSchema,
          body: reviewTaskResolveSchema,
          response: { 200: reviewTaskSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
        },
      },
      async (request) => {
        const { patientId, taskId } = request.params;
        const { ctx, task } = await taskScope(request, patientId, taskId, "close");
        return withTx(request, async ({ tx, audit: auditTx }) => {
          const at = now();
          const status = outcome === "resolve" ? "resolved" : "dismissed";
          const closed = await closeTask(tx, ctx, patientId, taskId, {
            status,
            userId: ctx.userId,
            note: request.body.note,
            at,
          });
          if (!closed) throw new AppError("invalid_transition");
          await auditTx({
            eventName: "review_task.resolve",
            action: "U",
            outcome: "success",
            resourceType: "ReviewTask",
            resourceId: taskId,
            patientId,
            purposeOfUse: ctx.role === "physical_therapist" ? "treatment" : "operations",
            metadata: { status, ruleKey: task.rule.key },
          });
          const row = await findTask(tx, ctx, patientId, taskId);
          return toReviewTask(row!, at, await isOnCareTeam(tx, ctx, patientId));
        });
      },
    );
  }

  app.post(
    "/patients/:patientId/check-ins/:checkInId/review",
    {
      config: { access: { permission: "clinical.write" } },
      schema: {
        operationId: "markCheckInReviewed",
        tags: ["check-ins"],
        summary: "Mark a check-in reviewed by the care team; 409 when it already is.",
        params: checkInIdParamsSchema,
        body: checkInReviewRequestSchema,
        response: { 200: checkInSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { patientId, checkInId } = request.params;
      await requirePatientRead(request, patientId);
      await requireChild(request, "PatientCheckIn", patientId, checkInId);
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
      return withTx(request, async ({ tx }) => {
        if (!(await markReviewed(tx, ctx, patientId, checkInId, ctx.userId, now()))) {
          throw new AppError("already_exists");
        }
        return (await findCheckIn(tx, ctx, patientId, checkInId))!;
      });
    },
  );

  app.get(
    "/review-rules",
    {
      config: { access: { permission: ["review_task.read", "review_rule.manage"] } },
      schema: {
        operationId: "listReviewRules",
        tags: ["review"],
        summary: "The organization's review rules with parameters and the demo-defaults notice.",
        response: { 200: reviewRuleListSchema, ...errorResponses(401, 403, 429) },
      },
    },
    async (request) => {
      const ctx = requireCtx(request.ctx);
      const rows = await listRules(db, ctx);
      return { items: rows.map(toRule), notice: REVIEW_RULE_DEFAULTS_NOTICE };
    },
  );

  app.put(
    "/review-rules/:ruleId",
    {
      config: { access: { permission: "review_rule.manage" } },
      schema: {
        operationId: "updateReviewRule",
        tags: ["review"],
        summary:
          "Enable, disable or change a rule's parameters. Later evaluations use the new values (AC-D4); audited.",
        params: ruleIdParamsSchema,
        body: reviewRuleUpdateSchema,
        response: { 200: reviewRuleSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { ruleId } = request.params;
      const ctx = await requireRule(request, ruleId);
      const current = await findRule(db, ctx, ruleId);
      if (!current || !isReviewRuleKey(current.key)) throw new AppError("not_found");
      const parsed = reviewRuleParamsSchemas[current.key].safeParse(request.body.params);
      if (!parsed.success) {
        throw new AppError("validation_error", [
          {
            path: "body.params",
            issue: "wrong_rule_shape",
            message: `Parameters do not fit the ${current.key} rule.`,
          },
        ]);
      }
      const params = parsed.data as Record<string, number>;
      return withTx(request, async ({ tx, audit: auditTx }) => {
        await updateRule(tx, ctx, ruleId, { enabled: request.body.enabled, params, at: now() });
        await auditTx({
          eventName: "review_rule.update",
          action: "U",
          outcome: "success",
          resourceType: "ReviewRule",
          resourceId: ruleId,
          purposeOfUse: "admin",
          metadata: {
            ruleKey: current.key,
            enabled: request.body.enabled,
            ...Object.fromEntries(Object.entries(params).map(([k, v]) => [`param.${k}`, v])),
          },
        });
        return toRule((await findRule(tx, ctx, ruleId))!);
      });
    },
  );
};
