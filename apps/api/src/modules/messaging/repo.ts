import { Prisma } from "@carepath/db/client";
import { initialStatus } from "@carepath/db";
import { roleLabels, type RoleKey } from "@carepath/shared/contracts";
import type { ConversationSummary, Message, MessageSender } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

/**
 * Conversations, participants and messages. Keyed by (organization, conversation); the caller's
 * participant row decides what they see. A message is visible to others only once it is `sent`;
 * the sender also sees their own queued and failed messages.
 */
type Scope = Pick<RequestCtx, "orgId" | "userId">;

const PREVIEW_LENGTH = 140;

const personSelect = {
  membership: {
    select: { role: { select: { key: true } }, user: { select: { displayName: true } } },
  },
} as const;

const conversationSelect = {
  id: true,
  subject: true,
  patientId: true,
  lastMessageAt: true,
  patient: { select: { id: true, givenName: true, familyName: true } },
  participants: {
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
    select: { userId: true, ...personSelect },
  },
} as const;

type ConversationRow = Prisma.ConversationGetPayload<{ select: typeof conversationSelect }>;

const messageSelect = {
  id: true,
  conversationId: true,
  senderUserId: true,
  body: true,
  status: true,
  failureReason: true,
  sentAt: true,
  createdAt: true,
  sender: { select: personSelect },
} as const;

type MessageRow = Prisma.MessageGetPayload<{ select: typeof messageSelect }>;

function person(
  userId: string,
  m: { role: { key: string }; user: { displayName: string } },
): MessageSender {
  const role = m.role.key as RoleKey;
  return { userId, name: m.user.displayName, role, roleLabel: roleLabels[role] };
}

export type ConversationAccess = "participant" | "organization";

export interface ConversationFacts {
  unreadCount: number;
  failedCount: number;
  preview: string | null;
}

export function toSummary(
  row: ConversationRow,
  access: ConversationAccess,
  facts: ConversationFacts,
): ConversationSummary {
  return {
    id: row.id,
    subject: row.subject,
    patient: row.patient,
    participants: row.participants.map((p) => person(p.userId, p.membership)),
    access,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    preview: access === "participant" ? facts.preview : null,
    unreadCount: access === "participant" ? facts.unreadCount : 0,
    failedCount: facts.failedCount,
  };
}

export function toMessage(row: MessageRow, viewerUserId: string): Message {
  const mine = row.senderUserId === viewerUserId;
  return {
    id: row.id,
    conversationId: row.conversationId,
    body: row.body,
    status: row.status,
    sender: person(row.senderUserId, row.sender.membership),
    mine,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    failureReason: mine ? row.failureReason : null,
    canRetry: mine && row.status === "failed",
  };
}

/** A conversation of the caller's organization, with who is in it. */
export async function findConversation(db: DbClient, ctx: Scope, conversationId: string) {
  return db.conversation.findFirst({
    where: { id: conversationId, organizationId: ctx.orgId },
    select: conversationSelect,
  });
}

/** Conversations the caller sits in, or every conversation of the organization (`message.org`). */
export async function listConversations(
  db: DbClient,
  ctx: Scope & Pick<RequestCtx, "patientId" | "role">,
  scope: "participant" | "organization",
  offset: number,
  take: number,
) {
  return db.conversation.findMany({
    where: {
      organizationId: ctx.orgId,
      ...(ctx.role === "patient" ? { patientId: ctx.patientId ?? "none" } : {}),
      ...(scope === "participant" ? { participants: { some: { userId: ctx.userId } } } : {}),
    },
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    skip: offset,
    take,
    select: conversationSelect,
  });
}

export async function isParticipant(
  db: DbClient,
  ctx: Scope,
  conversationId: string,
): Promise<boolean> {
  const row = await db.conversationParticipant.findFirst({
    where: { conversationId, userId: ctx.userId, organizationId: ctx.orgId },
    select: { id: true },
  });
  return row !== null;
}

/** What the caller may see of a conversation's messages. */
function visible(ctx: Scope, access: ConversationAccess) {
  return access === "participant"
    ? { OR: [{ status: "sent" as const }, { senderUserId: ctx.userId }] }
    : { status: "sent" as const };
}

export async function listMessages(
  db: DbClient,
  ctx: Scope,
  conversationId: string,
  access: ConversationAccess,
  offset: number,
  take: number,
) {
  const rows = await db.message.findMany({
    where: { organizationId: ctx.orgId, conversationId, ...visible(ctx, access) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: offset,
    take,
    select: messageSelect,
  });
  return rows.map((r) => toMessage(r, ctx.userId));
}

export async function findMessage(
  db: DbClient,
  ctx: Scope,
  conversationId: string,
  messageId: string,
) {
  const row = await db.message.findFirst({
    where: { id: messageId, conversationId, organizationId: ctx.orgId },
    select: messageSelect,
  });
  return row ? toMessage(row, ctx.userId) : null;
}

/** Unread, failed and preview facts for a page of conversations the caller is in. */
export async function conversationFacts(
  db: DbClient,
  ctx: Scope,
  rows: { id: string }[],
  access: (id: string) => ConversationAccess,
): Promise<Map<string, ConversationFacts>> {
  const ids = rows.map((r) => r.id);
  const facts = new Map<string, ConversationFacts>(
    ids.map((id) => [id, { unreadCount: 0, failedCount: 0, preview: null }]),
  );
  if (ids.length === 0) return facts;
  const unread = await unreadCounts(db, ctx, ids);
  for (const [id, n] of unread) facts.get(id)!.unreadCount = n;
  const failed = await db.message.groupBy({
    by: ["conversationId"],
    where: {
      organizationId: ctx.orgId,
      conversationId: { in: ids },
      senderUserId: ctx.userId,
      status: "failed",
    },
    _count: { _all: true },
  });
  for (const f of failed) facts.get(f.conversationId)!.failedCount = f._count._all;
  const newest = await db.message.findMany({
    where: {
      organizationId: ctx.orgId,
      conversationId: { in: ids.filter((id) => access(id) === "participant") },
      ...visible(ctx, "participant"),
    },
    orderBy: [{ conversationId: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    distinct: ["conversationId"],
    select: { conversationId: true, body: true },
  });
  for (const m of newest) {
    facts.get(m.conversationId)!.preview =
      m.body.length > PREVIEW_LENGTH ? `${m.body.slice(0, PREVIEW_LENGTH - 1)}…` : m.body;
  }
  return facts;
}

/**
 * Unread messages per conversation for the caller: messages from other people, delivered
 * (`sent`) after the caller's read marker. Computed in SQL from the participant row, never from
 * anything the client sends. Without `ids`, every conversation the caller is in.
 */
export async function unreadCounts(
  db: DbClient,
  ctx: Scope,
  ids?: string[],
): Promise<Map<string, number>> {
  const filter = ids ? Prisma.sql`AND m."conversationId" = ANY(${ids}::uuid[])` : Prisma.empty;
  const rows = await db.$queryRaw<{ conversationId: string; n: number }[]>`
    SELECT m."conversationId", COUNT(*)::int AS n
    FROM "Message" m
    JOIN "ConversationParticipant" cp
      ON cp."conversationId" = m."conversationId" AND cp."userId" = ${ctx.userId}::uuid
    WHERE m."organizationId" = ${ctx.orgId}::uuid
      AND cp."organizationId" = ${ctx.orgId}::uuid
      AND m.status = 'sent'
      AND m."senderUserId" <> ${ctx.userId}::uuid
      AND (cp."lastReadAt" IS NULL OR m."sentAt" > cp."lastReadAt")
      ${filter}
    GROUP BY m."conversationId"`;
  return new Map(rows.map((r) => [r.conversationId, r.n]));
}

/** Totals for Today and the clinician overview. */
export async function unreadSummary(db: DbClient, ctx: Scope) {
  const counts = await unreadCounts(db, ctx);
  let unreadCount = 0;
  for (const n of counts.values()) unreadCount += n;
  return { unreadCount, unreadConversations: counts.size };
}

/**
 * Moves the conversation's last-message time forward and returns the new message's createdAt.
 * The row lock serialises concurrent sends, and createdAt is strictly increasing per
 * conversation, so order never depends on a fixed or coarse clock.
 */
export async function nextMessageTime(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  conversationId: string,
  now: Date,
): Promise<Date> {
  const rows = await db.$queryRaw<{ lastMessageAt: Date }[]>`
    UPDATE "Conversation"
    SET "lastMessageAt" = CASE
          WHEN "lastMessageAt" IS NULL OR "lastMessageAt" < ${now}::timestamptz THEN ${now}::timestamptz
          ELSE "lastMessageAt" + interval '1 millisecond' END,
        "updatedAt" = ${now}::timestamptz
    WHERE id = ${conversationId}::uuid AND "organizationId" = ${ctx.orgId}::uuid
    RETURNING "lastMessageAt"`;
  const row = rows[0];
  if (!row) throw new Error("conversation vanished inside its transaction");
  return row.lastMessageAt;
}

export async function insertMessage(
  db: DbClient,
  ctx: Scope,
  input: { conversationId: string; body: string; createdAt: Date },
): Promise<string> {
  const row = await db.message.create({
    data: {
      organizationId: ctx.orgId,
      conversationId: input.conversationId,
      senderUserId: ctx.userId,
      body: input.body,
      status: initialStatus.Message,
      createdAt: input.createdAt,
    },
    select: { id: true },
  });
  // The sender's read marker is left alone: sending does not mean they saw what arrived meanwhile.
  return row.id;
}

/**
 * Moves the caller's read marker to now, or past the newest delivered message when the clock is
 * behind it. Never moves backwards. Returns the stored marker.
 */
export async function markRead(
  db: DbClient,
  ctx: Scope,
  conversationId: string,
  now: Date,
): Promise<Date> {
  const rows = await db.$queryRaw<{ lastReadAt: Date }[]>`
    UPDATE "ConversationParticipant" cp
    SET "lastReadAt" = GREATEST(
      COALESCE(cp."lastReadAt", ${now}::timestamptz),
      ${now}::timestamptz,
      COALESCE((SELECT MAX(m."sentAt") FROM "Message" m
                WHERE m."conversationId" = cp."conversationId" AND m.status = 'sent'), ${now}::timestamptz))
    WHERE cp."conversationId" = ${conversationId}::uuid
      AND cp."userId" = ${ctx.userId}::uuid
      AND cp."organizationId" = ${ctx.orgId}::uuid
    RETURNING cp."lastReadAt"`;
  const row = rows[0];
  if (!row) throw new Error("participant vanished inside its transaction");
  return row.lastReadAt;
}

/** queued -> sent. The send time is later than every delivered message and every read marker. */
export async function markSent(
  db: DbClient,
  scope: Pick<RequestCtx, "orgId">,
  messageId: string,
  now: Date,
): Promise<"sent" | "not_queued"> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    UPDATE "Message" m
    SET status = 'sent'::"MessageStatus",
        "failureReason" = NULL,
        "sentAt" = GREATEST(
          ${now}::timestamptz,
          m."createdAt",
          COALESCE((SELECT MAX(x."sentAt") + interval '1 millisecond' FROM "Message" x
                    WHERE x."conversationId" = m."conversationId"), ${now}::timestamptz),
          COALESCE((SELECT MAX(cp."lastReadAt") + interval '1 millisecond' FROM "ConversationParticipant" cp
                    WHERE cp."conversationId" = m."conversationId"), ${now}::timestamptz))
    WHERE m.id = ${messageId}::uuid AND m."organizationId" = ${scope.orgId}::uuid AND m.status = 'queued'
    RETURNING m.id`;
  return rows.length === 1 ? "sent" : "not_queued";
}

/** queued -> failed, with a plain reason the sender sees. */
export async function markFailed(
  db: DbClient,
  scope: Pick<RequestCtx, "orgId">,
  messageId: string,
  reason: string,
): Promise<boolean> {
  const res = await db.message.updateMany({
    where: { id: messageId, organizationId: scope.orgId, status: "queued" },
    data: { status: "failed", failureReason: reason },
  });
  return res.count === 1;
}

/** failed -> queued for a retry. False when the message is not failed any more. */
export async function requeueFailed(
  db: DbClient,
  ctx: Scope,
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  const res = await db.message.updateMany({
    where: {
      id: messageId,
      conversationId,
      organizationId: ctx.orgId,
      senderUserId: ctx.userId,
      status: "failed",
    },
    data: { status: "queued", failureReason: null },
  });
  return res.count === 1;
}
