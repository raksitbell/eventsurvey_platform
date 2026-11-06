import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  parseAuthSessionCookie,
} from "@/core/auth/cookie";
import { mockApi } from "@/core/api/mock-client";
import type { MockUser } from "@/types/mock";
import { AnalyticsError } from "@/core/analytics/policy";
const COOKIE = "eventsurvey_verified_session";
const state = globalThis as typeof globalThis & {
  eventSurveySigningKey?: string;
};
function key() {
  if (process.env.AUTH_SESSION_SECRET) return process.env.AUTH_SESSION_SECRET;
  if (process.env.NODE_ENV === "production")
    throw new AnalyticsError(503, "AUTH_SESSION_SECRET_REQUIRED");
  return (state.eventSurveySigningKey ??= randomBytes(32).toString("hex"));
}
export function issueVerifiedSession(response: NextResponse, userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ userId, expires: Date.now() + 8 * 60 * 60 * 1000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", key())
    .update(payload)
    .digest("base64url");
  response.cookies.set(COOKIE, `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}
export function clearVerifiedSession(response: NextResponse) {
  response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}
export async function verifiedActor(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) throw new AnalyticsError(401, "LOGIN_REQUIRED");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra)
    throw new AnalyticsError(401, "LOGIN_REQUIRED");
  const expected = createHmac("sha256", key()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new AnalyticsError(401, "LOGIN_REQUIRED");
  let claims: { userId: string; expires: number };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    throw new AnalyticsError(401, "LOGIN_REQUIRED");
  }
  if (
    !claims.userId ||
    !Number.isFinite(claims.expires) ||
    claims.expires <= Date.now()
  )
    throw new AnalyticsError(401, "LOGIN_REQUIRED");
  const actor = await mockApi.get<MockUser>(
    `/users/${encodeURIComponent(claims.userId)}`,
  );
  if (actor.status !== "active" || actor.removed_at)
    throw new AnalyticsError(403, "FORBIDDEN");
  const hint = parseAuthSessionCookie(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
  );
  if (!hint) throw new AnalyticsError(401, "LOGIN_REQUIRED");
  if (hint.userId !== actor.id) {
    if (actor.system_role !== "platform_admin" || !hint.impersonating)
      throw new AnalyticsError(403, "FORBIDDEN");
    const effective = await mockApi.get<MockUser>(
      `/users/${encodeURIComponent(hint.userId)}`,
    );
    return { actor, user: effective, impersonating: true };
  }
  return { actor, user: actor, impersonating: false };
}
