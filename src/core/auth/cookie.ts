import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@/types/user";
import { PORTAL_ROLES } from "./constants";
import { isImpersonatableRole } from "./permissions";

export const AUTH_SESSION_COOKIE = "eventsurvey_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

type SessionIdentity = {
  realUserId: string;
  userId: string;
  realRole: UserRole;
  role: UserRole;
  impersonating: boolean;
};

export type AuthSessionCookie = SessionIdentity & { expiresAt: number };

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

function isValidIdentity(data: Partial<AuthSessionCookie>) {
  if (
    typeof data.realUserId !== "string" || !data.realUserId ||
    typeof data.userId !== "string" || !data.userId ||
    !data.role || !PORTAL_ROLES.includes(data.role) ||
    !data.realRole || !PORTAL_ROLES.includes(data.realRole) ||
    typeof data.impersonating !== "boolean"
  ) {
    return false;
  }
  if (data.impersonating) {
    return (
      data.realRole === "super_admin" &&
      data.realUserId !== data.userId &&
      isImpersonatableRole(data.role)
    );
  }
  return data.realRole === data.role && data.realUserId === data.userId;
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
    ) as Partial<AuthSessionCookie> | null;
    if (
      !data ||
      typeof data.expiresAt !== "number" ||
      !Number.isSafeInteger(data.expiresAt) ||
      data.expiresAt <= now ||
      !isValidIdentity(data)
    ) {
      return null;
    }
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

  const claims = { ...identity, expiresAt };
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
