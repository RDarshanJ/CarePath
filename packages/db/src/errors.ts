/**
 * Database error classification. Callers map these to HTTP errors (e.g. booking overlap -> 409)
 * without parsing message text.
 */

/** SQLSTATE codes raised by CarePath constraints and triggers. */
export const DbErrorCode = {
  /** Exclusion constraint violated (overlapping appointment or slot). */
  exclusionViolation: "23P01",
  checkViolation: "23514",
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  notNullViolation: "23502",
  /** Status change not listed in StatusTransition. */
  illegalStatusTransition: "CP001",
  /** UPDATE or DELETE on an append-only table. */
  appendOnly: "CP002",
  /** Domain rule enforced by trigger (single profile, version numbering, signed notes). */
  domainRule: "CP003",
} as const;

export type DbErrorCodeValue = (typeof DbErrorCode)[keyof typeof DbErrorCode];

export interface DbErrorInfo {
  /** Five-character SQLSTATE. */
  code: string;
  /** Constraint name when Postgres reports one. */
  constraint?: string;
  message: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Extract the SQLSTATE and constraint from a pg error or a Prisma driver-adapter error.
 * Returns undefined when the error did not come from Postgres.
 */
export function dbErrorInfo(error: unknown): DbErrorInfo | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    const rec = asRecord(current);
    if (!rec) return undefined;
    // Prisma client error: { code: "P2002", meta: { driverAdapterError: { cause } } }
    const adapterError = asRecord(rec.meta)?.driverAdapterError;
    if (adapterError) {
      current = adapterError;
      continue;
    }
    // pg DatabaseError: { code: "23P01", constraint: "..." } (Prisma codes carry clientVersion)
    if (
      typeof rec.code === "string" &&
      /^[0-9A-Z]{5}$/.test(rec.code) &&
      !("clientVersion" in rec)
    ) {
      return {
        code: rec.code,
        constraint: typeof rec.constraint === "string" ? rec.constraint : undefined,
        message: String(rec.message ?? ""),
      };
    }
    // Prisma driver adapter: { cause: { originalCode, originalMessage, constraint? } }
    if (typeof rec.originalCode === "string") {
      const c = asRecord(rec.constraint);
      return {
        code: rec.originalCode,
        constraint: typeof c?.index === "string" ? c.index : undefined,
        message: String(rec.originalMessage ?? ""),
      };
    }
    current = rec.cause;
  }
  return undefined;
}

export function isDbError(error: unknown, code: DbErrorCodeValue): boolean {
  return dbErrorInfo(error)?.code === code;
}
