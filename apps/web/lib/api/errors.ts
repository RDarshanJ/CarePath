import { errorEnvelopeSchema, type ErrorCode, type ErrorDetail } from "@carepath/shared/contracts";

/**
 * A failed API call. The web branches on `code`, never on `message` (api-phase3.md, section 2).
 * `message` is the fixed per-code string from the envelope, safe to show.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: ErrorDetail[];

  constructor(status: number, code: ErrorCode, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the session is gone: the person has to sign in again. */
  get sessionEnded(): boolean {
    return (
      this.status === 401 && (this.code === "session_expired" || this.code === "unauthenticated")
    );
  }
}

/** Build an ApiError from a non-2xx response. Unreadable bodies become `internal_error` or `service_unavailable`. */
export async function errorFromResponse(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON (for example a proxy error page); fall through to the status-based code.
  }
  const parsed = errorEnvelopeSchema.safeParse(body);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(res.status, code, message, details);
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    return new ApiError(
      res.status,
      "service_unavailable",
      "The service is temporarily unavailable.",
    );
  }
  return new ApiError(res.status, "internal_error", "Something went wrong on our side.");
}

export function unreachable(): ApiError {
  return new ApiError(503, "service_unavailable", "The service is temporarily unavailable.");
}
