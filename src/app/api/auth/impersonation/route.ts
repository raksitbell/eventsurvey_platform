import { NextResponse, type NextRequest } from "next/server";
import { requireSessionActor } from "@/core/auth/api-guard";
import { readAuthSession, setAuthSessionCookie } from "@/core/auth/cookie";
import { canEnterAdminArea, isImpersonatableRole } from "@/core/auth/permissions";
import { projectUserPii } from "@/core/auth/pii";
import {
  authJson,
  readJsonObject,
  rejectCrossOrigin,
} from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/role-permissions";
import { getActivePortalAccount } from "@/services/auth/session";

export async function POST(request: NextRequest) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const auth = await requireSessionActor(readAuthSession(request));
  if (auth instanceof NextResponse) return auth;
  if (!canEnterAdminArea(auth.session.realRole, auth.session.impersonating)) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  const body = await readJsonObject(request);
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId) return authJson({ error: "INVALID_TARGET" }, 400);

  try {
    const { realAccount, session } = auth;
    if (
      !(await hasPlatformPermission(
        realAccount.platformRoleId,
        "impersonate_event_user",
      ))
    ) {
      return authJson({ error: "FORBIDDEN" }, 403);
    }

    const target = await getActivePortalAccount(userId);
    if (!target || !isImpersonatableRole(target.user.role)) {
      return authJson({ error: "INVALID_TARGET" }, 404);
    }

    const response = authJson({
      realUser: projectUserPii(realAccount.user, true),
      impersonatedUser: projectUserPii(target.user, false),
    });
    setAuthSessionCookie(
      response,
      {
        ...session,
        userId: target.user.id,
        role: target.user.role,
        impersonating: true,
      },
      session.expiresAt,
    );
    return response;
  } catch {
    return authJson({ error: "SESSION_UNAVAILABLE" }, 503);
  }
}

export async function DELETE(request: NextRequest) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const auth = await requireSessionActor(readAuthSession(request));
  if (auth instanceof NextResponse) return auth;
  const { realAccount, session } = auth;
  if (session.realRole !== "super_admin") {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  const response = authJson({
    realUser: projectUserPii(realAccount.user, true),
    impersonatedUser: null,
  });
  if (session.impersonating) {
    setAuthSessionCookie(
      response,
      {
        ...session,
        userId: session.realUserId,
        role: session.realRole,
        impersonating: false,
      },
      session.expiresAt,
    );
  }
  return response;
}
