import { headers } from "next/headers";
import { apiOrigin } from "./origin";
import { errorFromResponse, unreachable } from "./errors";
import type { Parser } from "./client";

/**
 * Server component API helper. It calls the API directly (no browser round trip), forwards the
 * incoming `cookie` header, and only issues GETs: mutations always come from the browser through
 * `/api` with a CSRF token (checkpoint C1, section 5.2).
 */
export async function serverGet<T>(path: string, parser: Parser<T>): Promise<T> {
  const cookie = (await headers()).get("cookie");
  let res: Response;
  try {
    res = await fetch(apiOrigin() + path, {
      method: "GET",
      headers: { accept: "application/json", ...(cookie ? { cookie } : {}) },
      cache: "no-store",
    });
  } catch {
    throw unreachable();
  }
  if (!res.ok) throw await errorFromResponse(res);
  return parser.parse(await res.json());
}
