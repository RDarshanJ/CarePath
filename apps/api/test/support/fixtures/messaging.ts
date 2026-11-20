/**
 * Messaging fixtures written straight to Postgres. There is no route that creates a
 * conversation in WP 4.2, so tests build threads here.
 */
import type { Db } from "../../../src/core/db/repo.js";
import type { OrgFixture } from "../repo.js";

export async function createConversation(
  db: Db,
  org: Pick<OrgFixture, "orgId">,
  input: { patientId: string; userIds: string[]; subject?: string; at?: Date },
): Promise<string> {
  const at = input.at ?? new Date("2026-11-19T10:00:00Z");
  const c = await db.conversation.create({
    data: {
      organizationId: org.orgId,
      patientId: input.patientId,
      subject: input.subject ?? "Questions about my plan",
      createdAt: at,
    },
    select: { id: true },
  });
  for (const userId of input.userIds) {
    await db.conversationParticipant.create({
      data: { organizationId: org.orgId, conversationId: c.id, userId, joinedAt: at },
    });
  }
  return c.id;
}

export async function messageRow(db: Db, id: string) {
  return db.message.findUniqueOrThrow({ where: { id } });
}

export async function participantRow(db: Db, conversationId: string, userId: string) {
  return db.conversationParticipant.findUniqueOrThrow({
    where: { conversationId_userId: { conversationId, userId } },
  });
}
