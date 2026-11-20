import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import {
  conversationIdParamsSchema,
  conversationPageSchema,
  conversationSummarySchema,
  cursorQuerySchema,
  markReadRequestSchema,
  messageIdParamsSchema,
  messagePageSchema,
  messageSchema,
  retryMessageRequestSchema,
  sendMessageRequestSchema,
  type ConversationPage,
  type MessagePage,
} from "@carepath/shared/contracts";
import { withTx } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { insertJob } from "../../core/jobs/repo.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import { requireCtx } from "../../core/context.js";
import { denyOutOfScope } from "../../core/scope/patient-scope.js";
import { findClinic } from "../clinic/repo.js";
import { requireConversation } from "./access.js";
import { MESSAGE_DELIVER_QUEUE } from "./delivery.js";
import {
  conversationFacts,
  findConversation,
  findMessage,
  insertMessage,
  listConversations,
  listMessages,
  markRead,
  nextMessageTime,
  requeueFailed,
  toSummary,
  unreadCounts,
  type ConversationAccess,
} from "./repo.js";

const messagePermissions = ["message.own", "message.care_team", "message.org"] as const;

/**
 * Messaging (WP 4.2). A thread is a patient and their care team. Participants read and write;
 * coordinators read through `message.org` and each such read is audited. Delivery is a job.
 */
export const messagingRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/conversations",
    {
      config: { access: { permission: messagePermissions } },
      schema: {
        operationId: "listConversations",
        tags: ["messaging"],
        summary:
          "The caller's conversations, newest first, with unread counts. Coordinators list every conversation of the clinic.",
        querystring: cursorQuerySchema,
        response: { 200: conversationPageSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request): Promise<ConversationPage> => {
      const ctx = requireCtx(request.ctx);
      const scope = ctx.permissions.has("message.org") ? "organization" : "participant";
      const offset = decodeCursor(request.query.cursor);
      const rows = await listConversations(db, ctx, scope, offset, request.query.limit + 1);
      const page = pageFrom(rows, offset, request.query.limit);
      const accessOf = (id: string): ConversationAccess =>
        page.items.find((c) => c.id === id)?.participants.some((p) => p.userId === ctx.userId)
          ? "participant"
          : "organization";
      const facts = await conversationFacts(db, ctx, page.items, accessOf);
      let unreadTotal = 0;
      for (const n of (await unreadCounts(db, ctx)).values()) unreadTotal += n;
      return {
        items: page.items.map((c) => toSummary(c, accessOf(c.id), facts.get(c.id)!)),
        nextCursor: page.nextCursor,
        unreadTotal,
      };
    },
  );

  app.get(
    "/conversations/:conversationId/messages",
    {
      config: { access: { permission: messagePermissions } },
      schema: {
        operationId: "listMessages",
        tags: ["messaging"],
        summary:
          "Messages of one conversation, newest first. Others see delivered messages only; the sender also sees queued and failed ones. A coordinator outside the thread reads it as an audited organization read.",
        params: conversationIdParamsSchema,
        querystring: cursorQuerySchema,
        response: { 200: messagePageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<MessagePage> => {
      const { ctx, conversation, access } = await requireConversation(
        request,
        request.params.conversationId,
        "read",
      );
      const offset = decodeCursor(request.query.cursor);
      const rows = await listMessages(
        db,
        ctx,
        conversation.id,
        access,
        offset,
        request.query.limit + 1,
      );
      const page = pageFrom(rows, offset, request.query.limit);
      const facts = await conversationFacts(db, ctx, [conversation], () => access);
      const clinic = await findClinic(db, ctx);
      return {
        ...page,
        conversation: toSummary(conversation, access, facts.get(conversation.id)!),
        composer: { replyTimeText: clinic.replyTimeText, emergencyNotice: EMERGENCY_NOTICE },
      };
    },
  );

  app.post(
    "/conversations/:conversationId/messages",
    {
      config: { access: { permission: messagePermissions } },
      schema: {
        operationId: "sendMessage",
        tags: ["messaging"],
        summary:
          "Send a message. It is created queued; a delivery job marks it sent, or failed with a retry.",
        params: conversationIdParamsSchema,
        body: sendMessageRequestSchema,
        response: { 201: messageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request, reply) => {
      const { ctx, conversation } = await requireConversation(
        request,
        request.params.conversationId,
        "write",
      );
      const message = await withTx(request, async ({ tx }) => {
        const createdAt = await nextMessageTime(tx, ctx, conversation.id, now());
        const id = await insertMessage(tx, ctx, {
          conversationId: conversation.id,
          body: request.body.body,
          createdAt,
        });
        await insertJob(tx, {
          queue: MESSAGE_DELIVER_QUEUE,
          payload: { messageId: id },
          organizationId: ctx.orgId,
          runAt: now(),
          dedupeKey: `${MESSAGE_DELIVER_QUEUE}:${id}`,
        });
        const row = await findMessage(tx, ctx, conversation.id, id);
        if (!row) throw new Error("message vanished inside its transaction");
        return row;
      });
      return reply.code(201).send(message);
    },
  );

  app.post(
    "/conversations/:conversationId/read",
    {
      config: { access: { permission: messagePermissions } },
      schema: {
        operationId: "markConversationRead",
        tags: ["messaging"],
        summary: "Move the caller's read marker to now. Participants only.",
        params: conversationIdParamsSchema,
        body: markReadRequestSchema,
        response: { 200: conversationSummarySchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { ctx, conversation } = await requireConversation(
        request,
        request.params.conversationId,
        "write",
      );
      await withTx(request, ({ tx }) => markRead(tx, ctx, conversation.id, now()));
      const facts = await conversationFacts(db, ctx, [conversation], () => "participant");
      const fresh = (await findConversation(db, ctx, conversation.id)) ?? conversation;
      return toSummary(fresh, "participant", facts.get(conversation.id)!);
    },
  );

  app.post(
    "/conversations/:conversationId/messages/:messageId/retry",
    {
      config: { access: { permission: messagePermissions } },
      schema: {
        operationId: "retryMessage",
        tags: ["messaging"],
        summary:
          "Try a failed message again. Only its sender can; it goes back to queued and a new delivery job is enqueued.",
        params: messageIdParamsSchema,
        body: retryMessageRequestSchema,
        response: { 200: messageSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { conversationId, messageId } = request.params;
      const { ctx, conversation } = await requireConversation(request, conversationId, "write");
      const existing = await findMessage(db, ctx, conversation.id, messageId);
      if (!existing) return denyOutOfScope(request, "Message", messageId, conversation.patientId);
      if (!existing.mine) throw new AppError("forbidden");
      return withTx(request, async ({ tx }) => {
        if (!(await requeueFailed(tx, ctx, conversation.id, messageId))) {
          throw new AppError("invalid_transition");
        }
        await insertJob(tx, {
          queue: MESSAGE_DELIVER_QUEUE,
          payload: { messageId },
          organizationId: ctx.orgId,
          runAt: now(),
          dedupeKey: `${MESSAGE_DELIVER_QUEUE}:${messageId}`,
        });
        const row = await findMessage(tx, ctx, conversation.id, messageId);
        if (!row) throw new Error("message vanished inside its transaction");
        return row;
      });
    },
  );
};
