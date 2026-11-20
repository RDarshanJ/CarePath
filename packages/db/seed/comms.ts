/** Conversations and messages between patients and their care team, with unread state and failures. */
import { D, H, MIN, iso, type Ctx } from "./ctx.js";
import {
  clinicianMessages,
  conversationSubjects,
  failedMessageReason,
  patientMessages,
} from "./data/text.js";

export interface UnreadMessage {
  userId: string;
  organizationId: string;
  conversationId: string;
  messageId: string;
  atMs: number;
  fromName: string;
}

export function buildConversations(ctx: Ctx): UnreadMessage[] {
  const { t } = ctx;
  const unread: UnreadMessage[] = [];
  let genericIndex = 0;

  for (const p of ctx.patients) {
    if (!p.userId || p.status === "intake_incomplete") continue;
    const rng = ctx.rng.fork(`conversation/${p.id}`);
    if (p.persona !== "demo" && !rng.chance(0.55)) continue;
    const staffUserId = p.therapist?.userId ?? p.org.coordinatorUserId;
    const staffName = p.therapist?.displayName ?? "Care coordinator";
    const limit = Math.min(ctx.anchorMs - 30 * MIN, p.activeEndMs + 3 * D);
    const startMs = Math.min(p.createdAtMs + rng.int(1, 6) * D, limit - 6 * H);
    if (startMs < p.createdAtMs) continue;
    const convId = ctx.id("conversation", p.id);
    const count = p.persona === "demo" ? 4 : rng.int(2, 6);
    if (p.persona === null) genericIndex += 1;
    const failedConversation =
      p.persona === null && (genericIndex === 2 || genericIndex % 25 === 0);

    const msgs: { id: string; fromPatient: boolean; atMs: number; body: string }[] = [];
    let at = startMs;
    for (let i = 0; i < count; i++) {
      if (i > 0) at += rng.int(1, 30) * H;
      if (at > limit) break;
      // Demo patient's thread ends with a therapist reply the patient has not read yet.
      const fromPatient =
        p.persona === "demo"
          ? i % 2 === 0
          : i === 0
            ? rng.chance(0.8)
            : !(msgs[i - 1] as { fromPatient: boolean }).fromPatient;
      const body = fromPatient ? rng.pick(patientMessages) : rng.pick(clinicianMessages);
      msgs.push({ id: ctx.id("message", `${convId}/${i}`), fromPatient, atMs: at, body });
    }
    if (msgs.length === 0) continue;
    if (failedConversation) (msgs[msgs.length - 1] as { fromPatient: boolean }).fromPatient = true;
    const last = msgs[msgs.length - 1] as (typeof msgs)[number];
    const lastIsFailed = failedConversation;

    t.Conversation.push({
      id: convId,
      organizationId: p.org.id,
      patientId: p.id,
      subject: rng.pick(conversationSubjects),
      lastMessageAt: iso(last.atMs),
      createdAt: iso(startMs),
      updatedAt: iso(last.atMs),
    });

    // Read state: a thread the other side has not opened shows as unread.
    const patientUnread = !last.fromPatient && (p.persona === "demo" || rng.chance(0.4));
    const staffUnread = last.fromPatient && !lastIsFailed && rng.chance(0.6);
    const prevAt = msgs.length > 1 ? (msgs[msgs.length - 2] as (typeof msgs)[number]).atMs : null;
    const readAfter = Math.min(last.atMs + H, ctx.anchorMs - MIN);
    const patientRead = patientUnread
      ? prevAt !== null
        ? iso(prevAt + 5 * MIN)
        : null
      : iso(readAfter);
    const staffRead = staffUnread
      ? prevAt !== null
        ? iso(prevAt + 5 * MIN)
        : null
      : iso(readAfter);
    t.ConversationParticipant.push(
      {
        id: ctx.id("participant", `${convId}/patient`),
        organizationId: p.org.id,
        conversationId: convId,
        userId: p.userId,
        lastReadAt: patientRead,
        joinedAt: iso(startMs),
      },
      {
        id: ctx.id("participant", `${convId}/staff`),
        organizationId: p.org.id,
        conversationId: convId,
        userId: staffUserId,
        lastReadAt: staffRead,
        joinedAt: iso(startMs),
      },
    );
    msgs.forEach((m, i) => {
      const failed = lastIsFailed && i === msgs.length - 1;
      t.Message.push({
        id: m.id,
        organizationId: p.org.id,
        conversationId: convId,
        senderUserId: m.fromPatient ? p.userId! : staffUserId,
        body: m.body,
        status: failed ? "failed" : "sent",
        failureReason: failed ? failedMessageReason : null,
        sentAt: failed ? null : iso(m.atMs + 2000),
        createdAt: iso(m.atMs),
      });
    });
    if (patientUnread)
      unread.push({
        userId: p.userId,
        organizationId: p.org.id,
        conversationId: convId,
        messageId: last.id,
        atMs: last.atMs,
        fromName: staffName,
      });
    if (staffUnread)
      unread.push({
        userId: staffUserId,
        organizationId: p.org.id,
        conversationId: convId,
        messageId: last.id,
        atMs: last.atMs,
        fromName: `${p.givenName} ${p.familyName}`,
      });
  }
  return unread;
}
