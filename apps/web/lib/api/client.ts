import { sessionInfoSchema } from "@carepath/shared/contracts";
import { ApiError, errorFromResponse, unreachable } from "./errors";

/**
 * Browser API client. Every call goes to the web origin under /api, which Next rewrites to the API.
 * Mutations send the session's CSRF token in `x-csrf-token`; the token comes from GET /auth/session
 * (or the login response) and is held in memory only. Response bodies are parsed with the Zod
 * schemas from `@carepath/shared/contracts`, so a drifting API fails loudly instead of rendering wrong data.
 */
export const API_PREFIX = "/api";

/** Anything with a Zod-style `parse`; keeps this file free of a direct zod import. */
export interface Parser<T> {
  parse(data: unknown): T;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  body?: unknown;
  /** Public endpoints (login): no CSRF token, and a 401 is a result, not a signed-out event. */
  public?: boolean;
  /** Do not send the browser to sign-in when the session has already ended (used by sign-out). */
  quietSessionEnd?: boolean;
}

let csrfToken: string | null = null;

export function rememberCsrfToken(token: string | null): void {
  csrfToken = token;
}

let signingOut = false;

/**
 * Called by Sign out before it ends the session: a poll that answers 401 while sign-out is under way
 * (the shell's badge counts) must not send the browser to "Sign in to continue" instead of "You are
 * signed out".
 */
export function markSigningOut(value = true): void {
  signingOut = value;
}

/** Send the browser to sign-in with a reason and the page to come back to. */
export function redirectToSignIn(reason: "expired" | "required"): void {
  csrfToken = null;
  if (signingOut) return;
  if (typeof window === "undefined" || window.location.pathname.startsWith("/login")) return;
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/login?${new URLSearchParams({ reason, next }).toString()}`);
}

async function send(method: Method, path: string, options: RequestOptions, csrf: string | null) {
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (csrf) headers["x-csrf-token"] = csrf;
  try {
    return await fetch(API_PREFIX + path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw unreachable();
  }
}

async function currentCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const session = await apiRequest("GET", "/auth/session", sessionInfoSchema);
  csrfToken = session.csrfToken;
  return csrfToken;
}

export async function apiRequest<T>(
  method: Method,
  path: string,
  parser: Parser<T> | null,
  options: RequestOptions = {},
): Promise<T> {
  const mutating = method !== "GET";
  let csrf = mutating && !options.public ? await currentCsrfToken() : null;
  let res = await send(method, path, options, csrf);

  if (!res.ok && mutating && !options.public) {
    const first = await errorFromResponse(res.clone());
    if (first.code === "csrf_failed") {
      // The token belongs to an older session (another tab signed in again). Fetch a fresh one once.
      csrfToken = null;
      csrf = await currentCsrfToken();
      res = await send(method, path, options, csrf);
    }
  }

  if (!res.ok) {
    const error = await errorFromResponse(res);
    if (error.sessionEnded && !options.public && !options.quietSessionEnd) {
      redirectToSignIn(error.code === "session_expired" ? "expired" : "required");
    }
    throw error;
  }
  if (res.status === 204 || parser === null) return undefined as T;
  try {
    return parser.parse(await res.json());
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw new ApiError(502, "internal_error", "The server sent a reply this page could not read.");
  }
}

export const api = {
  get: <T>(path: string, parser: Parser<T>) => apiRequest("GET", path, parser),
  post: <T>(path: string, parser: Parser<T> | null, body?: unknown) =>
    apiRequest("POST", path, parser, { body }),
  put: <T>(path: string, parser: Parser<T> | null, body?: unknown) =>
    apiRequest("PUT", path, parser, { body }),
  patch: <T>(path: string, parser: Parser<T> | null, body?: unknown) =>
    apiRequest("PATCH", path, parser, { body }),
  delete: <T>(path: string, parser: Parser<T> | null) => apiRequest("DELETE", path, parser),
};
