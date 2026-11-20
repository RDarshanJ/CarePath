import { z } from "zod";
import { roleKeySchema } from "./auth.js";
import { instantSchema, pageOf } from "./common.js";

/**
 * Messaging (REQ-MSG-01 to REQ-MSG-03, AC-E9 to AC-E11). A conversation is one patient and their
 * care team. Only participants read, send, mark read and retry. Coordinators (`message.org`) may
 * read the messages of any conversation in the organization; each such read is an audit event.
 *
 * Message status as the people on screen see it:
 * - queued: accepted, not yet delivered. Only the sender sees it.
 * - sent: delivered. Visible to every participant.
 * - failed: delivery failed. Only the sender sees it, with `canRetry` true.
 */
export const messageStatusSchema = z.enum(["queued", "sent", "failed"]);
export type MessageStatus = z.infer<typeof messageStatusSchema>;

export const conversationIdParamsSchema = z.object({ conversationId: z.uuid() });
export const messageIdParamsSchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});

export const roleLabels = {
  patient: "Patient",
  physical_therapist: "Physical therapist",
  care_coordinator: "Care coordinator",
  clinic_admin: "Clinic administrator",
} as const;

export const messageSenderSchema = z.object({
  userId: z.uuid(),
  name: z.string(),
  role: roleKeySchema,
  /** Plain words for the role, for display next to the name (REQ-MSG-02). */
  roleLabel: z.string(),
});
export type MessageSender = z.infer<typeof messageSenderSchema>;

export const conversationParticipantSchema = messageSenderSchema;

export const conversationSummarySchema = z
  .object({
    id: z.uuid(),
    subject: z.string(),
    patient: z.object({ id: z.uuid(), givenName: z.string(), familyName: z.string() }),
    participants: z.array(conversationParticipantSchema),
    /** `participant`, or `organization` for a coordinator reading a thread they are not in. */
    access: z.enum(["participant", "organization"]),
    lastMessageAt: instantSchema.nullable(),
    /**
     * First 140 characters of the newest message the caller may see. Null for the organization
     * view: a body is only shown by the audited messages read.
     */
    preview: z.string().nullable(),
    /** Messages from others, delivered after the caller's read marker. Always 0 for the organization view. */
    unreadCount: z.number().int(),
    /** The caller's own messages in this thread that failed and can be retried. */
    failedCount: z.number().int(),
  })
  .meta({ id: "ConversationSummary" });
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export const conversationPageSchema = pageOf(conversationSummarySchema)
  .extend({
    /** Unread messages across all of the caller's conversations, not only this page. */
    unreadTotal: z.number().int(),
  })
  .meta({ id: "ConversationPage" });
export type ConversationPage = z.infer<typeof conversationPageSchema>;

export const messageSchema = z
  .object({
    id: z.uuid(),
    conversationId: z.uuid(),
    body: z.string(),
    status: messageStatusSchema,
    sender: messageSenderSchema,
    /** True when the caller sent it. */
    mine: z.boolean(),
    createdAt: instantSchema,
    sentAt: instantSchema.nullable(),
    /** Plain reason, shown to the sender only. */
    failureReason: z.string().nullable(),
    /** True for the sender's failed message. */
    canRetry: z.boolean(),
  })
  .meta({ id: "Message" });
export type Message = z.infer<typeof messageSchema>;

export const messagePageSchema = pageOf(messageSchema)
  .extend({
    conversation: conversationSummarySchema,
    /** Composer copy: reply time from clinic settings and the fixed emergency notice (REQ-MSG-02). */
    composer: z.object({
      replyTimeText: z.string().nullable(),
      emergencyNotice: z.string(),
    }),
  })
  .meta({ id: "MessagePage" });
export type MessagePage = z.infer<typeof messagePageSchema>;

export const MESSAGE_BODY_MAX = 2000;

export const sendMessageRequestSchema = z
  .object({ body: z.string().trim().min(1).max(MESSAGE_BODY_MAX) })
  .strict()
  .meta({ id: "SendMessageRequest" });
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

export const markReadRequestSchema = z.object({}).strict().meta({ id: "MarkReadRequest" });
export const retryMessageRequestSchema = z.object({}).strict().meta({ id: "RetryMessageRequest" });

/** Unread count carried by Today (patient) and the clinician overview. */
export const unreadMessagesSchema = z.object({
  unreadCount: z.number().int(),
  unreadConversations: z.number().int(),
});
export type UnreadMessages = z.infer<typeof unreadMessagesSchema>;
