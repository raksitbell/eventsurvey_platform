import { ServiceError } from "@/core/api/service-error";
import {
  denyUnlessEventPermission,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { isInspectingEvent } from "@/core/auth/cookie";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import { getEventWorkspace } from "@/services/event/workspace";
import { getSubUsers, inviteSubUser } from "@/services/event/sub-users";
import type { InviteSubUserInput } from "@/types/event/permissions";
import type { NextRequest } from "next/server";

function workspaceOptions(session: {
  inspectedEventId: string | null;
  impersonating: boolean;
  realRole: string;
}) {
  return {
    inspectedEventId: isInspectingEvent(session)
      ? session.inspectedEventId
      : null,
  };
}

/** GET /api/event/sub-users */
export async function GET(request: NextRequest) {
  const sessionOrDeny = await requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  try {
    const inspecting = isInspectingEvent(sessionOrDeny);
    const workspace = await getEventWorkspace(
      sessionOrDeny.userId,
      undefined,
      workspaceOptions(sessionOrDeny),
    );
    if (!workspace) {
      return authJson({ error: "Workspace not found" }, 404);
    }

    const data = await getSubUsers(workspace.eventId, sessionOrDeny.userId, {
      inspector: inspecting,
    });
    return authJson({
      ...data,
      canManageSubUsers:
        inspecting ||
        (!sessionOrDeny.impersonating && data.canManageSubUsers),
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to load sub-users" }, 502);
  }
}

/** POST /api/event/sub-users - Invite a new sub-user */
export async function POST(request: NextRequest) {
  const sessionOrDeny = await requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;
  if (sessionOrDeny.impersonating && !sessionOrDeny.inspectedEventId) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const inspecting = isInspectingEvent(sessionOrDeny);
    const workspace = await getEventWorkspace(
      sessionOrDeny.userId,
      undefined,
      workspaceOptions(sessionOrDeny),
    );
    if (!workspace) {
      return authJson({ error: "Workspace not found" }, 404);
    }

    const denied = await denyUnlessEventPermission(
      sessionOrDeny.userId,
      "manage_sub_user",
      workspace.eventId,
      sessionOrDeny,
    );
    if (denied) return denied;

    const body = await readJsonObject(request);
    if (!body) return authJson({ error: "INVALID_JSON" }, 400);

    const { email, name, roleName, permissions } = body;
    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof name !== "string" ||
      !name.trim() ||
      typeof roleName !== "string" ||
      !roleName.trim() ||
      typeof permissions !== "object" ||
      permissions === null ||
      Array.isArray(permissions)
    ) {
      return authJson(
        {
          error: "MISSING_REQUIRED_FIELDS",
          message: "All fields are required",
        },
        400,
      );
    }

    const input: InviteSubUserInput = {
      email,
      name,
      roleName,
      permissions: permissions as InviteSubUserInput["permissions"],
    };
    const created = await inviteSubUser(
      workspace.eventId,
      input,
      sessionOrDeny.userId,
      { inspector: inspecting },
    );
    return authJson(created, 201);
  } catch (error) {
    if (error instanceof ServiceError) {
      return authJson(
        { error: error.code, message: error.message },
        error.status,
      );
    }
    return authJson({ error: "Failed to invite sub-user" }, 502);
  }
}
