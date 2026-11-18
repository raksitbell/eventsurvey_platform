import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { ServiceError } from "@/core/api/service-error";
import { hasPlatformPermission } from "@/core/mock/role-permissions";
import { getActiveDashboardAccount } from "@/services/auth/dashboard-session";
import type { MockUser } from "@/types/mock";

const COOKIE = "eventsurvey_verified_session";
const SESSION_MAX_AGE = 8 * 60 * 60;
const state = globalThis as typeof globalThis & {
  eventSurveySigningKey?: string;
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
} as const;

type VerifiedSession = {
  userId: string;
  expires: number;
  effectiveUserId?: string;
};

export class VerifiedSessionError extends ServiceError {
  constructor(status: number, code: string) {
    super(code, status);
  }
}

function key() {
  if (process.env.AUTH_SESSION_SECRET) return process.env.AUTH_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new VerifiedSessionError(503, "AUTH_SESSION_SECRET_REQUIRED");
  }
  return (state.eventSurveySigningKey ??= randomBytes(32).toString("hex"));
}

export function issueVerifiedSession(
  response: NextResponse,
  userId: string,
  options: Partial<Pick<VerifiedSession, "effectiveUserId" | "expires">> = {},
) {
  const expires = options.expires ?? Date.now() + SESSION_MAX_AGE * 1000;
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      expires,
      effectiveUserId: options.effectiveUserId,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", key())
    .update(payload)
    .digest("base64url");
  response.cookies.set(COOKIE, `${payload}.${signature}`, {
    ...cookieOptions,
    maxAge: Math.max(0, Math.ceil((expires - Date.now()) / 1000)),
  });
}

export function clearVerifiedSession(response: NextResponse) {
  response.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

function readVerifiedSession(request: NextRequest): VerifiedSession {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token || token.length > 4096) {
    throw new VerifiedSessionError(401, "LOGIN_REQUIRED");
  }

  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length) {
    throw new VerifiedSessionError(401, "LOGIN_REQUIRED");
  }
  const expected = Buffer.from(
    createHmac("sha256", key()).update(payload).digest("base64url"),
  );
  const supplied = Buffer.from(signature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw new VerifiedSessionError(401, "LOGIN_REQUIRED");
  }

  let claims: VerifiedSession | null;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new VerifiedSessionError(401, "LOGIN_REQUIRED");
  }
  if (
    !claims ||
    typeof claims.userId !== "string" ||
    !claims.userId ||
    !Number.isSafeInteger(claims.expires) ||
    claims.expires <= Date.now() ||
    (claims.effectiveUserId !== undefined &&
      (typeof claims.effectiveUserId !== "string" ||
        !claims.effectiveUserId ||
        claims.effectiveUserId === claims.userId))
  ) {
    throw new VerifiedSessionError(401, "LOGIN_REQUIRED");
  }
  return claims;
}

export async function verifiedAccount(request: NextRequest) {
  const session = readVerifiedSession(request);
  const actor = await getActiveDashboardAccount(session.userId);
  if (!actor) throw new VerifiedSessionError(403, "FORBIDDEN");
  return { actor, session };
}

export async function verifiedImpersonationTarget(
  actor: MockUser,
  userId: string,
) {
  if (
    actor.system_role !== "platform_admin" ||
    !(await hasPlatformPermission(
      actor.platform_role_id,
      "impersonate_event_user",
    ))
  ) {
    throw new VerifiedSessionError(403, "FORBIDDEN");
  }
  const target = await getActiveDashboardAccount(userId);
  if (
    target?.system_role !== "event_user" ||
    !target.event_id ||
    !target.role_id
  ) {
    throw new VerifiedSessionError(403, "INVALID_TARGET");
  }
  return target;
}

export async function verifiedActor(request: NextRequest) {
  const { actor, session } = await verifiedAccount(request);
  if (!session.effectiveUserId) {
    return { actor, user: actor, impersonating: false };
  }
  const user = await verifiedImpersonationTarget(
    actor,
    session.effectiveUserId,
  );
  return { actor, user, impersonating: true };
}
