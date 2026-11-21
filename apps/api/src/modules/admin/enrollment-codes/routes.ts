import { randomInt } from "node:crypto";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  emptyBodySchema,
  enrollmentCodeIdParamsSchema,
  enrollmentCodeIssueSchema,
  enrollmentCodeIssuedSchema,
  enrollmentCodePageSchema,
  enrollmentCodeQuerySchema,
  enrollmentCodeSchema,
  type EnrollmentCode,
  type EnrollmentCodeIssued,
  type EnrollmentCodePage,
} from "@carepath/shared/contracts";
import { enrollmentCodeLabel, hashEnrollmentCode } from "@carepath/shared/enrollment-code";
import { requireCtx } from "../../../core/context.js";
import { withTx } from "../../../core/db/tx.js";
import { AppError, errorResponses } from "../../../core/errors.js";
import { decodeCursor, pageFrom } from "../../../core/pagination.js";
import { denyOutOfScope } from "../../../core/scope/patient-scope.js";
import { findCode, insertCode, listCodes, revokeCode } from "./repo.js";

/** No 0, 1, I, L, O: codes are read aloud and typed. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;
const DAY = 86_400_000;

function newCode(): string {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return raw;
}

/** Shown as three groups of four; spaces are ignored when the code is entered. */
const grouped = (raw: string) => raw.replace(/(.{4})(?=.)/g, "$1 ");

/**
 * Eligibility codes for onboarding (AC-A3), `enrollment.manage`. The raw code is returned once,
 * in the response that creates it, and cannot be read again: the table keeps a SHA-256 hash and
 * a four-character label. List and revoke answer with the label and status only.
 */
export const enrollmentCodeRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;
  const access = { permission: "enrollment.manage" } as const;

  app.get(
    "/enrollment-codes",
    {
      config: { access },
      schema: {
        operationId: "listEnrollmentCodes",
        tags: ["admin"],
        summary:
          "Eligibility codes of the organization, newest first, by label and status. Never the code itself.",
        querystring: enrollmentCodeQuerySchema,
        response: { 200: enrollmentCodePageSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request): Promise<EnrollmentCodePage> => {
      const ctx = requireCtx(request.ctx);
      const { status, limit } = request.query;
      const offset = decodeCursor(request.query.cursor);
      const rows = await listCodes(db, ctx, { status, offset, take: limit + 1, now: now() });
      return pageFrom(rows, offset, limit);
    },
  );

  app.post(
    "/enrollment-codes",
    {
      config: { access },
      schema: {
        operationId: "issueEnrollmentCode",
        tags: ["admin"],
        summary:
          "Issue an eligibility code. The response is the only time the code is returned; audited.",
        body: enrollmentCodeIssueSchema,
        response: { 201: enrollmentCodeIssuedSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request, reply): Promise<EnrollmentCodeIssued> => {
      const ctx = requireCtx(request.ctx);
      const at = now();
      const days = request.body.expiresInDays;
      const result = await withTx(request, async ({ tx, audit }) => {
        for (let attempt = 0; attempt < 5; attempt++) {
          const raw = newCode();
          const id = await insertCode(tx, ctx, {
            codeHash: hashEnrollmentCode(raw),
            label: enrollmentCodeLabel(raw),
            expiresAt: new Date(at.getTime() + days * DAY),
            now: at,
          });
          if (!id) continue;
          await audit({
            eventName: "enrollment_code.issue",
            action: "C",
            outcome: "success",
            resourceType: "EnrollmentCode",
            resourceId: id,
            purposeOfUse: "admin",
            metadata: { expiresInDays: days },
          });
          return { id, raw };
        }
        throw new Error("could not draw an unused eligibility code");
      });
      const row = (await findCode(db, ctx, result.id, at))!;
      void reply.code(201);
      return { ...row, code: grouped(result.raw) };
    },
  );

  app.post(
    "/enrollment-codes/:codeId/revoke",
    {
      config: { access },
      schema: {
        operationId: "revokeEnrollmentCode",
        tags: ["admin"],
        summary:
          "Revoke an unused code so it can no longer be redeemed. 409 when it is already used, expired or revoked; audited.",
        params: enrollmentCodeIdParamsSchema,
        body: emptyBodySchema,
        response: { 200: enrollmentCodeSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request): Promise<EnrollmentCode> => {
      const ctx = requireCtx(request.ctx);
      const { codeId } = request.params;
      const at = now();
      if (!(await findCode(db, ctx, codeId, at))) {
        return denyOutOfScope(request, "EnrollmentCode", codeId, null);
      }
      await withTx(request, async ({ tx, audit }) => {
        if (!(await revokeCode(tx, ctx, codeId, at))) throw new AppError("invalid_transition");
        await audit({
          eventName: "enrollment_code.revoke",
          action: "U",
          outcome: "success",
          resourceType: "EnrollmentCode",
          resourceId: codeId,
          purposeOfUse: "admin",
        });
      });
      return (await findCode(db, ctx, codeId, at))!;
    },
  );
};
