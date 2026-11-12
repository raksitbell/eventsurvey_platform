import { ServiceError } from "@/core/api/service-error";
import {
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { getEventWorkspace } from "@/services/event/workspace";
import {
  removeSubUser,
  updateSubUserPermissions,
} from "@/services/event/sub-users";
import type { UpdateSubUserPermissionsInput } from "@/types/event/permissions";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/event/sub-users/[id] - Update permissions or role name */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const sessionOrDeny = requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  const { id } = await context.params;

  try {
    const workspace = await getEventWorkspace(sessionOrDeny.userId);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const input = body as UpdateSubUserPermissionsInput;
    if (!input.permissions) {
      return NextResponse.json(
        { error: "MISSING_PERMISSIONS", message: "Permissions are required" },
        { status: 400 },
      );
    }

    const updated = await updateSubUserPermissions(
      workspace.eventId,
      id,
      input,
      sessionOrDeny.userId,
    );
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to update sub-user";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** DELETE /api/event/sub-users/[id] - Remove sub-user from event */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const sessionOrDeny = requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  const { id } = await context.params;

  try {
    const workspace = await getEventWorkspace(sessionOrDeny.userId);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    await removeSubUser(workspace.eventId, id, sessionOrDeny.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to remove sub-user";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
