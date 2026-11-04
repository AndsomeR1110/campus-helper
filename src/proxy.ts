import { NextResponse, type NextRequest } from "next/server";

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

/** Kept in sync with SESSION_COOKIE in src/lib/auth/session.ts (edge runtime cannot import it). */
const SESSION_COOKIE = "ch_session";

export default function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets, API routes, the manifest and icons.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)"],
};
