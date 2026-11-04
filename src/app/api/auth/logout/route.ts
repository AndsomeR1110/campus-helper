import { NextResponse } from "next/server";

import { ok, toErrorResponse } from "@/lib/api";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { clearSessionCookie } from "@/lib/auth/session";

/** 退出登录（PG-01 / AUTH-AC-04）。清空 Cookie 即可，JWT 无需服务端撤销。 */
export async function POST(): Promise<NextResponse> {
  try {
    await clearSessionCookie();
    return ok({ signedOut: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * GET /api/auth/logout?next=…
 * Clears the cookie and redirects. Used when a page detects an invalid session
 * (e.g. a token for a deleted user) so the browser lands on /login instead of
 * bouncing between the proxy and the page.
 */
export async function GET(request: Request): Promise<NextResponse> {
  await clearSessionCookie();
  const next = new URL(request.url).searchParams.get("next");
  return NextResponse.redirect(new URL(safeRedirectPath(next, "/login"), request.url));
}
