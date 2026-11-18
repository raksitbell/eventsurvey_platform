import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthSessionSecret } from "./cookie";

export const SETUP_PASSWORD_INVITE_DAYS = 7;
const INVITE_LIFETIME_MS = SETUP_PASSWORD_INVITE_DAYS * 24 * 60 * 60 * 1000;

function signInvite(value: string, secret: string): string {
  return createHmac("sha256", secret)
    .update("eventsurvey:setup-password:")
    .update(value)
    .digest("base64url");
}

export function issueSetupPasswordInvite(userId: string, now = Date.now()): string {
  const secret = getAuthSessionSecret();
  if (!secret) throw new Error("AUTH_SESSION_SECRET is missing or too short");

  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt: now + INVITE_LIFETIME_MS }),
  ).toString("base64url");
  const value = `v1~${payload}`;
  return `${value}~${signInvite(value, secret)}`;
}

export function readSetupPasswordInvite(token: string, now = Date.now()): string | null {
  const secret = getAuthSessionSecret();
  if (!secret || token.length > 2048) return null;

  const [version, payload, signature, ...extra] = token.split("~");
  if (version !== "v1" || !payload || !signature || extra.length > 0) return null;

  const expected = Buffer.from(signInvite(`${version}~${payload}`, secret));
  const supplied = Buffer.from(signature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: unknown;
      expiresAt?: unknown;
    } | null;
    if (
      typeof claims?.userId !== "string" || !claims.userId ||
      typeof claims.expiresAt !== "number" || !Number.isSafeInteger(claims.expiresAt) ||
      claims.expiresAt <= now
    ) {
      return null;
    }
    return claims.userId;
  } catch {
    return null;
  }
}
