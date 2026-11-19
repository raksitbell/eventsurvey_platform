import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { isImpersonatableRole } from "@/core/auth/permissions";
import { mayViewPii, projectUserPii } from "@/core/auth/pii";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import {
  getUserForImpersonation,
  updateUserRoleOrEvent,
} from "@/services/admin/users";
import { getPlatformPiiViewer } from "@/services/auth/pii-access";
import type { UserRole } from "@/types/user";
import type { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  try {
    const { id } = await context.params;
    const user = await getUserForImpersonation(id);

    if (!user) {
      return authJson({ error: "User not found" }, 404);
    }

    if (!isImpersonatableRole(user.role)) {
      return authJson({ error: "User cannot be impersonated" }, 403);
    }

    const viewer = await getPlatformPiiViewer(session);
    return authJson({
      user: projectUserPii(user, mayViewPii(viewer, user.id)),
    });
  } catch {
    return authJson({ error: "Failed to load user" }, 502);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    if (!body) return authJson({ error: "INVALID_BODY" }, 400);

    const eventId =
      "eventId" in body
        ? typeof body.eventId === "string" && body.eventId.trim()
          ? body.eventId.trim()
          : null
        : undefined;
    const role =
      typeof body.role === "string" ? (body.role as UserRole) : undefined;

    const result = await updateUserRoleOrEvent(
      id,
      { eventId, role },
      session.realUserId,
    );
    return authJson(result);
  } catch {
    return authJson({ error: "Failed to update user" }, 500);
  }
}
