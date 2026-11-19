import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import { ServiceError } from "@/core/api/service-error";
import { updatePlatformAccessFlags } from "@/services/admin/users";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/admin/users/[id]/platform-access — toggle platform boolean flags */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "manage_platform_users"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const { id } = await context.params;
    if (id === session.realUserId) {
      // Allow self-edit of activity view; still require manage_platform_users.
    }

    const body = await readJsonObject(request);
    if (!body) return authJson({ error: "INVALID_JSON" }, 400);

    const canViewActivity = body.canViewActivity;
    const canInspection = body.canInspection;
    if (typeof canViewActivity !== "boolean" || typeof canInspection !== "boolean") {
      return authJson({ error: "INVALID_FLAGS" }, 400);
    }

    const updated = await updatePlatformAccessFlags(
      id,
      { canViewActivity, canInspection },
      session.realUserId,
    );
    return authJson(updated);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to update platform access" }, 502);
  }
}
