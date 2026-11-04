/**
 * Web Push delivery (task #30).
 *
 * Deliberately dependency-free: VAPID is a plain ES256 JWT and we send a
 * **payload-less** push, which needs no message encryption (RFC 8291 is only
 * required when a body is attached). The service worker wakes up and fetches
 * `/api/notifications` to decide what to show.
 *
 * Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (base64url, as produced by
 * `web-push generate-vapid-keys`), optionally VAPID_SUBJECT.
 */

import { createPrivateKey, sign } from "node:crypto";

export interface VapidKeys {
  /** Public key, base64url, 65 bytes uncompressed. */
  publicKey: string;
  /** Private key, base64url, 32 bytes. */
  privateKey: string;
  /** `mailto:` or https URL identifying the sender. */
  subject: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Reads the keys from the environment; returns null when push is not configured. */
export function readVapidKeys(env: NodeJS.ProcessEnv = process.env): VapidKeys | null {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return null;
  }

  return {
    publicKey,
    privateKey,
    subject: env.VAPID_SUBJECT ?? "mailto:support@campus-helper.local",
  };
}

function audienceOf(endpoint: string): string {
  const url = new URL(endpoint);

  return `${url.protocol}//${url.host}`;
}

function encodeSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/**
 * VAPID JWT (RFC 8292): ES256 over `header.payload`, valid for 12 hours.
 * The signature must be raw r||s (ieee-p1363), not DER.
 */
export function buildVapidJwt(endpoint: string, keys: VapidKeys, now: Date): string {
  const header = encodeSegment({ typ: "JWT", alg: "ES256" });
  const payload = encodeSegment({
    aud: audienceOf(endpoint),
    exp: Math.floor(now.getTime() / 1000) + 12 * 60 * 60,
    sub: keys.subject,
  });
  const unsigned = `${header}.${payload}`;

  const publicBytes = Buffer.from(keys.publicKey, "base64url");
  const privateKey = createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      d: keys.privateKey,
      x: publicBytes.subarray(1, 33).toString("base64url"),
      y: publicBytes.subarray(33, 65).toString("base64url"),
    },
  });

  const signature = sign("sha256", Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  return `${unsigned}.${signature.toString("base64url")}`;
}

export interface PushResult {
  endpoint: string;
  ok: boolean;
  status: number;
}

/** Sends one payload-less push. 404/410 mean the subscription is gone. */
export async function sendPush(target: PushTarget, keys: VapidKeys, now: Date): Promise<PushResult> {
  const jwt = buildVapidJwt(target.endpoint, keys, now);

  const response = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      TTL: "300",
      Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
      "Content-Length": "0",
    },
  });

  return { endpoint: target.endpoint, ok: response.ok, status: response.status };
}

/** True when the subscription must be deleted (gone or forbidden). */
export function isExpiredSubscription(result: PushResult): boolean {
  return result.status === 404 || result.status === 410 || result.status === 403;
}
