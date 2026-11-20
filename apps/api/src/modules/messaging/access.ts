import type { FastifyRequest } from "fastify";
import { requireCtx, type RequestCtx } from "../../core/context.js";
import { denyOutOfScope } from "../../core/scope/patient-scope.js";
import { findConversation, type ConversationAccess } from "./repo.js";

/** The row a conversation route works on, with how the caller reached it. */
export interface ConversationScope {
  ctx: RequestCtx;
  conversation: NonNullable<Awaited<ReturnType<typeof findConversation>>>;
  access: ConversationAccess;
}

/**
 * The one scoped helper for conversation ids (REQ-MSG-03, AC-E11). Every messaging route with a
 * conversation id calls it before touching the thread.
 *
 * - Participants read and write. Being on the patient's care team is not enough: a clinician who
 *   is not in the thread gets what a missing thread gets.
 * - Coordinators (`message.org`) may read a thread they are not in; that read writes a `phi.read`
 *   event naming the conversation and patient (C1 ruling 3.7). They cannot write, mark read or
 *   retry there.
 * - Anyone else, and any id outside the organization: 404 with the byte-identical body and a
 *   `security.access_denied` event naming the id.
 */
export async function requireConversation(
  request: FastifyRequest,
  conversationId: string,
  mode: "read" | "write",
): Promise<ConversationScope> {
  const ctx = requireCtx(request.ctx);
  const { db, audit } = request.server.deps;
  const conversation = await findConversation(db, ctx, conversationId);
  if (!conversation) return denyOutOfScope(request, "Conversation", conversationId, null);
  const sitsIn = conversation.participants.some((p) => p.userId === ctx.userId);
  const ownThread = ctx.role !== "patient" || ctx.patientId === conversation.patientId;
  if (sitsIn && ownThread) return { ctx, conversation, access: "participant" };
  if (mode === "read" && ctx.permissions.has("message.org") && ctx.role !== "patient") {
    await audit.fromRequest(request, {
      eventName: "phi.read",
      action: "R",
      outcome: "success",
      resourceType: "Conversation",
      resourceId: conversationId,
      patientId: conversation.patientId,
      purposeOfUse: "operations",
      detailCode: "message_org",
    });
    return { ctx, conversation, access: "organization" };
  }
  return denyOutOfScope(request, "Conversation", conversationId, conversation.patientId);
}
