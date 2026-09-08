import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts` (function `middleware` -> `proxy`).
// This performs only an OPTIMISTIC check against the cookie — it verifies the
// JWT signature/expiry but does NOT hit the DB for the general pass-through
// case (that authoritative check happens in the route/layout via
// getCurrentUser()). It exists purely to bounce obviously logged-out/logged-in
// users before a page even renders.
//
// A stale-but-present cookie (bad signature, expired, or a sessionId the DB
// no longer has — e.g. after a local DB reset/reseed) must never look like a
// valid session here: getCurrentUser() will reject it and redirect to
// /login, and if this check still thought the cookie meant "logged in" it
// would immediately bounce /login back to /today — an infinite redirect
// loop that renders as a blank page. JWT verification alone catches a bad
// signature or expiry; it can't see a DB row that's gone, so /login and
// /signup (the only routes that redirect an "authed" visitor away) also
// confirm the session still exists in the DB before doing that redirect.
const COOKIE_NAME = "forkcast_session";

const AUTH_ONLY_ROUTES = ["/login", "/signup"];
const PROTECTED_PREFIXES = ["/today", "/scan", "/search", "/insights", "/profile", "/onboarding"];

async function verifySessionCookie(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return typeof payload.sessionId === "string" ? payload.sessionId : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionId = await verifySessionCookie(request);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY_ROUTES.includes(pathname);

  if (isProtected && !sessionId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthOnly && sessionId) {
    const session = await db.session.findUnique({ where: { id: sessionId }, select: { expiresAt: true } });
    if (session && session.expiresAt > new Date()) {
      return NextResponse.redirect(new URL("/today", request.url));
    }
    // Cookie carries a well-formed, signed JWT but the DB session behind it
    // is gone or expired — clear it so this dead end doesn't keep firing.
    const response = NextResponse.next();
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
