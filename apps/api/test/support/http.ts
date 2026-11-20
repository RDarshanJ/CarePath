import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify";
import { buildApp, type BuildAppOptions } from "../../src/app.js";
import type { Db } from "../../src/core/db/repo.js";
import { latestActiveSessionId, PASSWORD } from "./repo.js";

export const ORIGIN = "http://127.0.0.1:3000";

export function testApp(db: Db, options: BuildAppOptions = {}): Promise<FastifyInstance> {
  return buildApp({
    db,
    ...options,
    config: {
      rateLimit: { globalPerMinute: 10_000, loginPerMinute: 10 },
      ...options.config,
    },
  });
}

export interface Session {
  cookie: string;
  csrfToken: string;
  sessionId: string;
  body: Record<string, unknown>;
}

export function sessionCookie(res: LightMyRequestResponse): string {
  const c = res.cookies.find((x) => x.name === "cp_session");
  if (!c) throw new Error(`no session cookie (status ${res.statusCode}): ${res.body}`);
  return `cp_session=${c.value}`;
}

export async function loginRaw(
  app: FastifyInstance,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { origin: ORIGIN, ...headers },
    payload: body,
  });
}

export async function login(
  app: FastifyInstance,
  email: string,
  extra: Record<string, unknown> = {},
): Promise<Session> {
  const res = await loginRaw(app, { email, password: PASSWORD, ...extra });
  if (res.statusCode !== 200) throw new Error(`login failed ${res.statusCode}: ${res.body}`);
  const body = res.json() as Record<string, unknown>;
  const sessionId = await latestActiveSessionId(app.deps.db, (body["user"] as { id: string }).id);
  return {
    cookie: sessionCookie(res),
    csrfToken: body["csrfToken"] as string,
    sessionId,
    body,
  };
}

/** Request as a signed-in browser: cookie, Origin and CSRF header. */
export function as(app: FastifyInstance, session: Session) {
  return (opts: InjectOptions & { url: string }) =>
    app.inject({
      ...opts,
      headers: {
        cookie: session.cookie,
        origin: ORIGIN,
        "x-csrf-token": session.csrfToken,
        ...(opts.headers as Record<string, string> | undefined),
      },
    });
}
