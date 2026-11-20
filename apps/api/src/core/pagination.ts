import { AppError } from "./errors.js";

/**
 * Opaque list cursors (route table rule 10). A cursor encodes the offset of the next page in a
 * list with a stable total order (every ORDER BY ends with the row id). Clients pass
 * `nextCursor` back unchanged; a cursor that does not decode is a 400 on `cursor`.
 */
export function decodeCursor(cursor: string | undefined): number {
  if (cursor === undefined) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "o" in parsed &&
      Number.isInteger(parsed.o) &&
      (parsed.o as number) >= 0 &&
      (parsed.o as number) <= 1_000_000
    ) {
      return parsed.o as number;
    }
  } catch {
    // fall through
  }
  throw new AppError("validation_error", [
    { path: "querystring.cursor", issue: "invalid_cursor", message: "Unknown cursor." },
  ]);
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset })).toString("base64url");
}

/**
 * Fetch `limit + 1` rows from `offset`; this trims the extra row and builds nextCursor.
 */
export function pageFrom<T>(rows: T[], offset: number, limit: number) {
  const hasMore = rows.length > limit;
  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  };
}
