import { ServiceError } from "@/core/api/service-error";
import {
  denyUnlessEventPermission,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { getEventWorkspace } from "@/services/event/workspace";
import { getSubUsers, inviteSubUser } from "@/services/event/sub-users";
import type { InviteSubUserInput } from "@/types/event/permissions";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/event/sub-users */
export async function GET(request: NextRequest) {
  const sessionOrDeny = requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  try {
    const workspace = await getEventWorkspace(sessionOrDeny.userId);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const data = await getSubUsers(workspace.eventId, sessionOrDeny.userId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to load sub-users";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** POST /api/event/sub-users - Invite a new sub-user */
export async function POST(request: NextRequest) {
  const sessionOrDeny = requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  try {
    const workspace = await getEventWorkspace(sessionOrDeny.userId);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const denied = await denyUnlessEventPermission(
      sessionOrDeny.userId,
      "manage_sub_user",
      workspace.eventId,
    );
    if (denied) return denied;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const input = body as InviteSubUserInput;
    if (!input.email || !input.name || !input.roleName || !input.permissions) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS", message: "All fields are required" },
        { status: 400 },
      );
    }

    const created = await inviteSubUser(
      workspace.eventId,
      input,
      sessionOrDeny.userId,
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to invite sub-user";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
