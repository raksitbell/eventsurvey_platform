import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthSessionSecret } from "./cookie";

function signReset(value: string, secret: string): string {
  return createHmac("sha256", secret)
    .update("eventsurvey:reset-password:")
    .update(value)
    .digest("base64url");
}

/** Stamp binds the token to the current password so it stops working after a change. */
export function passwordStamp(password: string, secret: string): string {
  return createHmac("sha256", secret)
    .update("eventsurvey:reset-password:pwd:")
    .update(password)
    .digest("base64url")
    .slice(0, 24);
}

/** Issue a signed reset token with no time expiry. */
export function issueResetPasswordToken(
  userId: string,
  password: string,
): string {
  const secret = getAuthSessionSecret();
  if (!secret) throw new Error("AUTH_SESSION_SECRET is missing or too short");

  const payload = Buffer.from(
    JSON.stringify({ userId, pwd: passwordStamp(password, secret) }),
  ).toString("base64url");
  const value = `v1~${payload}`;
  return `${value}~${signReset(value, secret)}`;
}

export function readResetPasswordToken(
  token: string,
): { userId: string; pwd: string } | null {
  const secret = getAuthSessionSecret();
  if (!secret || token.length > 2048) return null;

  const [version, payload, signature, ...extra] = token.split("~");
  if (version !== "v1" || !payload || !signature || extra.length > 0) return null;

  const expected = Buffer.from(signReset(`${version}~${payload}`, secret));
  const supplied = Buffer.from(signature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userId?: unknown; pwd?: unknown } | null;
    if (
      typeof claims?.userId !== "string" ||
      !claims.userId ||
      typeof claims.pwd !== "string" ||
      !claims.pwd
    ) {
      return null;
    }
    return { userId: claims.userId, pwd: claims.pwd };
  } catch {
    return null;
  }
}
