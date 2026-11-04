import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/**
 * Proxy — Next.js 16 renamed `middleware.ts` to `proxy.ts`.
 *
 * Responsibility boundary (docs/frontend-architecture.md §5.1):
 *   This file only performs **fast redirects**. It is not authorization — every page
 *   query and route handler must check the session again, because a cookie can be
 *   forged or stale and Server Component rendering does not always pass through here.
 *
 * Rules:
 *   - signed out on a protected page → /login?next=<original path>   (AUTH-AC-03)
 *   - signed in on /login or /register → /home                       (avoid re-login)
 */
const PROTECTED_PREFIXES = [
  "/home",
  "/services",
  "/office-hours",
  "/spaces",
  "/bookings",
  "/schedule",
  "/courses",
  "/notifications",
  "/lost-found",
  "/my",
  "/profile",
  "/teacher",
  "/admin",
];

const AUTH_PAGES = ["/login", "/register"];

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // Verify the signature and expiry, not just the cookie's presence: otherwise an
  // expired or tampered cookie bounces /login → /home and the user can never sign in again.
  const hasSession = token ? (await verifySession(token)) !== null : false;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  let response: NextResponse;
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    response = NextResponse.redirect(loginUrl);
  } else if (AUTH_PAGES.includes(pathname) && hasSession) {
    response = NextResponse.redirect(new URL("/home", request.url));
  } else {
    response = NextResponse.next();
  }

  // Drop an invalid cookie so the browser stops sending it.
  if (token && !hasSession) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Skip static assets, API routes, the manifest and icons.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)"],
};
