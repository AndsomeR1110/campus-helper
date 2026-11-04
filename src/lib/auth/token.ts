import { SignJWT, jwtVerify } from "jose";

import type { Role } from "@prisma/client";

/**
 * JWT signing and verification, shared by the session helpers and
 * `src/proxy.ts` (Proxy runs on the Node.js runtime in Next.js 16, so it can
 * verify tokens itself). Must not import `next/headers` or `server-only`.
 */

export const SESSION_COOKIE = "ch_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 天

export interface SessionPayload {
  sub: string;
  role: Role;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short (need >= 32 chars). Set it in .env.local — see .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

/** Returns the payload of a valid, unexpired token, otherwise null. */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as Role };
  } catch {
    return null;
  }
}
