import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { PORTAL_ROLES } from "@/core/auth/constants";
import { isImpersonatableRole } from "@/core/auth/permissions";
import type { UserRole } from "@/types/user";

export const AUTH_SESSION_COOKIE = "eventsurvey_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

type SessionIdentity = {
  realUserId: string;
  userId: string;
  realRole: UserRole;
  role: UserRole;
  /** Platform admin inspecting a specific event workspace (no role swap). */
  inspectedEventId: string | null;
};

export type AuthSessionCookie = SessionIdentity & { expiresAt: number };
// V1 signs this flag as well as the two account IDs. Reject any disagreement.
type V1Claims = AuthSessionCookie & { impersonating: boolean };

export function isLegacyImpersonation(
  session: Pick<SessionIdentity, "realUserId" | "userId">,
) {
  return session.realUserId !== session.userId;
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export function getAuthSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  return secret && Buffer.byteLength(secret) >= 32 ? secret : null;
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret)
    .update("eventsurvey:session:")
    .update(value)
    .digest("base64url");
}

function isValidIdentity(data: Partial<V1Claims>) {
  if (
    typeof data.realUserId !== "string" ||
    !data.realUserId ||
    typeof data.userId !== "string" ||
    !data.userId ||
    !data.role ||
    !PORTAL_ROLES.includes(data.role) ||
    !data.realRole ||
    !PORTAL_ROLES.includes(data.realRole) ||
    data.impersonating !== (data.realUserId !== data.userId)
  ) {
    return false;
  }

  const inspected =
    data.inspectedEventId === null ||
    data.inspectedEventId === undefined ||
    (typeof data.inspectedEventId === "string" &&
      data.inspectedEventId.length > 0);
  if (!inspected) return false;

  if (data.inspectedEventId) {
    return (
      data.realRole === "super_admin" &&
      data.role === "super_admin" &&
      !data.impersonating
    );
  }

  if (data.impersonating) {
    return data.realRole === "super_admin" && isImpersonatableRole(data.role);
  }
  return data.realRole === data.role;
}

export function parseAuthSessionCookie(
  raw: string | undefined | null,
  now = Date.now(),
): AuthSessionCookie | null {
  const secret = getAuthSessionSecret();
  if (!raw || raw.length > 4096 || !secret) return null;

  const [version, payload, signature, ...extra] = raw.split(".");
  if (version !== "v1" || !payload || !signature || extra.length) return null;
  const expected = Buffer.from(sign(`${version}.${payload}`, secret));
  const supplied = Buffer.from(signature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<V1Claims> | null;
    if (
      !data ||
      typeof data.expiresAt !== "number" ||
      !Number.isSafeInteger(data.expiresAt) ||
      data.expiresAt <= now
    ) {
      return null;
    }
    // Older cookies omit inspectedEventId — treat as null.
    if (data.inspectedEventId === undefined) {
      data.inspectedEventId = null;
    }
    if (!isValidIdentity(data)) return null;
    return data as AuthSessionCookie;
  } catch {
    return null;
  }
}

export function readAuthSession(request: NextRequest) {
  return parseAuthSessionCookie(request.cookies.get(AUTH_SESSION_COOKIE)?.value);
}

export function setAuthSessionCookie(
  response: NextResponse,
  identity: SessionIdentity,
  expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
) {
  const secret = getAuthSessionSecret();
  if (!secret) throw new Error("AUTH_SESSION_SECRET is missing or too short");

  const claims = {
    ...identity,
    impersonating: isLegacyImpersonation(identity),
    inspectedEventId: identity.inspectedEventId ?? null,
    expiresAt,
  };
  if (!isValidIdentity(claims)) throw new Error("Invalid session identity");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const value = `v1.${payload}`;
  response.cookies.set(AUTH_SESSION_COOKIE, `${value}.${sign(value, secret)}`, {
    ...cookieOptions,
    maxAge: Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
  });
}

export function clearAuthSessionCookie(response: NextResponse) {
  response.cookies.set(AUTH_SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

/** Platform admin currently inspecting an event workspace. */
export function isInspectingEvent(
  session: AuthSessionCookie | null,
): session is AuthSessionCookie & { inspectedEventId: string } {
  return Boolean(
    session &&
      session.realRole === "super_admin" &&
      !isLegacyImpersonation(session) &&
      session.inspectedEventId,
  );
}
