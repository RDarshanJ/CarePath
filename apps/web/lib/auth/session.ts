import { cache } from "react";
import { sessionInfoSchema, type SessionInfo } from "@carepath/shared/contracts";
import { ApiError } from "../api/errors";
import { serverGet } from "../api/server";

export type SessionResult =
  { status: "signed_in"; session: SessionInfo } | { status: "expired" } | { status: "signed_out" };

/**
 * The current session as the API sees it, read once per request. Expired and signed-out are
 * ordinary results; any other failure (API down, 500) is thrown so the error page shows it
 * instead of pretending the person is signed out.
 */
export const getSession = cache(async (): Promise<SessionResult> => {
  try {
    return { status: "signed_in", session: await serverGet("/auth/session", sessionInfoSchema) };
  } catch (error) {
    if (error instanceof ApiError && error.sessionEnded) {
      return { status: error.code === "session_expired" ? "expired" : "signed_out" };
    }
    throw error;
  }
});
