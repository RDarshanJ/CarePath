import { z } from "zod";

/**
 * API configuration, read once from the environment and validated. Tests pass overrides to
 * buildApp() instead of mutating process.env.
 */
const minutes = (n: number) => n * 60_000;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://carepath:carepath@127.0.0.1:54329/carepath"),
  SESSION_SECRET: z.string().default("change-me-dev-only"),
  CORS_ORIGINS: z.string().default("http://127.0.0.1:3000,http://localhost:3000"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  RATE_LIMIT_GLOBAL_PER_MINUTE: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_LOGIN_PER_MINUTE: z.coerce.number().int().positive().default(10),
});

export interface AppConfig {
  env: "development" | "test" | "production";
  databaseUrl: string;
  /** HMAC key for CSRF tokens and source-IP hashes. Never logged. */
  sessionSecret: string;
  /** Exact origins allowed for CORS and for the Origin check on mutating requests. */
  allowedOrigins: string[];
  cookie: { name: string; secure: boolean };
  session: {
    /** PRD section 13: 30 minutes idle. */
    idleTimeoutMs: number;
    /** PRD section 13: 12 hours absolute. */
    absoluteTimeoutMs: number;
    /** lastSeenAt is written at most this often, to keep reads cheap. */
    touchIntervalMs: number;
  };
  rateLimit: { globalPerMinute: number; loginPerMinute: number };
  logLevel: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const production = parsed.NODE_ENV === "production";
  if (production && parsed.SESSION_SECRET === "change-me-dev-only") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  const secure = parsed.COOKIE_SECURE ? parsed.COOKIE_SECURE === "true" : production;
  return {
    env: parsed.NODE_ENV,
    databaseUrl: parsed.DATABASE_URL,
    sessionSecret: parsed.SESSION_SECRET,
    allowedOrigins: parsed.CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    // The __Host- prefix makes the browser refuse the cookie unless it is Secure, host-only
    // and Path=/. It cannot be used on plain-http local development.
    cookie: { name: secure ? "__Host-cp_session" : "cp_session", secure },
    session: {
      idleTimeoutMs: minutes(30),
      absoluteTimeoutMs: minutes(12 * 60),
      touchIntervalMs: 60_000,
    },
    rateLimit: {
      globalPerMinute: parsed.RATE_LIMIT_GLOBAL_PER_MINUTE,
      loginPerMinute: parsed.RATE_LIMIT_LOGIN_PER_MINUTE,
    },
    logLevel: parsed.LOG_LEVEL ?? (parsed.NODE_ENV === "test" ? "silent" : "info"),
  };
}
