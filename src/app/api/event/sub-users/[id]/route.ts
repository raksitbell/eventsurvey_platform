import { ServiceError } from "@/core/api/service-error";
import {
  denyUnlessEventPermission,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import { getEventWorkspace } from "@/services/event/workspace";
import {
  removeSubUser,
  updateSubUserPermissions,
} from "@/services/event/sub-users";
import type { UpdateSubUserPermissionsInput } from "@/types/event/permissions";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/event/sub-users/[id] - Update permissions or role name */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionOrDeny = await requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;
  if (sessionOrDeny.impersonating) return authJson({ error: "FORBIDDEN" }, 403);

  const { id } = await context.params;

  try {
    const workspace = await getEventWorkspace(sessionOrDeny.userId);
    if (!workspace) {
      return authJson({ error: "Workspace not found" }, 404);
    }

    const denied = await denyUnlessEventPermission(
      sessionOrDeny.userId,
      "manage_sub_user",
      workspace.eventId,
    );
    if (denied) return denied;

    const body = await readJsonObject(request);
    if (!body) return authJson({ error: "INVALID_JSON" }, 400);

    const { permissions, roleName } = body;
    if (
      typeof permissions !== "object" ||
      permissions === null ||
      Array.isArray(permissions)
    ) {
      return authJson(
        { error: "MISSING_PERMISSIONS", message: "Permissions are required" },
        400,
      );
    }
    if (roleName !== undefined && typeof roleName !== "string") {
      return authJson({ error: "INVALID_ROLE_NAME" }, 400);
    }

    const input: UpdateSubUserPermissionsInput = {
      roleName,
      permissions: permissions as UpdateSubUserPermissionsInput["permissions"],
    };

    const updated = await updateSubUserPermissions(
      workspace.eventId,
      id,
      input,
      sessionOrDeny.userId,
    );
    return authJson(updated);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to update sub-user" }, 502);
  }
}

/** DELETE /api/event/sub-users/[id] - Remove sub-user from event */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const sessionOrDeny = await requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;
  if (sessionOrDeny.impersonating) return authJson({ error: "FORBIDDEN" }, 403);

  const { id } = await context.params;

  try {
    const workspace = await getEventWorkspace(sessionOrDeny.userId);
    if (!workspace) {
      return authJson({ error: "Workspace not found" }, 404);
    }

    const denied = await denyUnlessEventPermission(
      sessionOrDeny.userId,
      "manage_sub_user",
      workspace.eventId,
    );
    if (denied) return denied;

    await removeSubUser(workspace.eventId, id, sessionOrDeny.userId);
    return authJson({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to remove sub-user" }, 502);
  }
}
