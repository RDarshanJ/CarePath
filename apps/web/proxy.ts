import { NextResponse, type NextRequest } from "next/server";

/**
 * Records the requested path in a request header so server-side guards can send a signed-out
 * visitor to /login with a return path (layouts cannot read the URL). The header is overwritten
 * here, so a client cannot choose its value, and the guard still validates it before use.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-cp-path", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
