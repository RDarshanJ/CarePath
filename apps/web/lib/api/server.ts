import { headers } from "next/headers";
import { apiOrigin } from "./origin";
import { errorFromResponse, unreachable } from "./errors";
import type { Parser } from "./client";

/**
 * Server component API helper. It calls the API directly (no browser round trip), forwards the
 * incoming `cookie` header, and only issues GETs: mutations always come from the browser through
 * `/api` with a CSRF token (checkpoint C1, section 5.2).
 *
 * It also forwards `x-forwarded-for` and `x-request-id` (checkpoint C2, F3). `next start` sets
 * `x-forwarded-for` to the incoming header or, without one, the connection address, so the API
 * (TRUST_PROXY=loopback) sees the browser's address rather than the web server's.
 */
export async function serverGet<T>(path: string, parser: Parser<T>): Promise<T> {
  const incoming = await headers();
  const forwarded: Record<string, string> = {};
  for (const name of ["cookie", "x-forwarded-for", "x-request-id"]) {
    const value = incoming.get(name);
    if (value) forwarded[name] = value;
  }
  let res: Response;
  try {
    res = await fetch(apiOrigin() + path, {
      method: "GET",
      headers: { accept: "application/json", ...forwarded },
      cache: "no-store",
    });
  } catch {
    throw unreachable();
  }
  if (!res.ok) throw await errorFromResponse(res);
  return parser.parse(await res.json());
}
