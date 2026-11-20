import type { Db } from "../db/repo.js";

/** Login lookup by normalised email. Returns null for unknown users. */
export async function findUserForLogin(db: Db, email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      status: true,
      passwordHash: true,
      memberships: {
        where: { status: "active", organization: { active: true } },
        select: {
          organizationId: true,
          organization: { select: { slug: true } },
        },
      },
    },
  });
}

export async function createSession(
  db: Db,
  input: {
    orgId: string;
    userId: string;
    tokenHash: string;
    now: Date;
    expiresAt: Date;
    userAgent: string | null;
  },
): Promise<string> {
  const row = await db.authSession.create({
    data: {
      organizationId: input.orgId,
      userId: input.userId,
      tokenHash: input.tokenHash,
      createdAt: input.now,
      lastSeenAt: input.now,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent?.slice(0, 200) ?? null,
    },
    select: { id: true },
  });
  return row.id;
}

export async function recordLogin(db: Db, userId: string, now: Date): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: now } });
}

/** Everything the request context needs, in one query. */
export async function findSessionByTokenHash(db: Db, tokenHash: string) {
  return db.authSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      revokedAt: true,
      organization: { select: { id: true, name: true, slug: true, active: true } },
      membership: {
        select: {
          status: true,
          role: { select: { key: true, permissions: true } },
          user: { select: { id: true, email: true, displayName: true, status: true } },
          patient: { select: { id: true } },
          practitioner: { select: { id: true } },
        },
      },
    },
  });
}

export type SessionRow = NonNullable<Awaited<ReturnType<typeof findSessionByTokenHash>>>;

export async function touchSession(db: Db, sessionId: string, now: Date): Promise<void> {
  await db.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { lastSeenAt: now },
  });
}

export async function revokeSession(db: Db, sessionId: string, now: Date): Promise<void> {
  await db.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: now },
  });
}

export async function revokeSessionByTokenHash(db: Db, tokenHash: string, now: Date) {
  await db.authSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: now },
  });
}
