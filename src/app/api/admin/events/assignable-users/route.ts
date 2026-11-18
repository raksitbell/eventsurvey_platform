import {
  isAuthSession,
  requireAdminSession,
} from "@/core/auth/api-guard";
import { listAssignableAdmins } from "@/services/admin/events";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/events/assignable-users */
export async function GET(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (!isAuthSession(denied)) return denied;

  try {
    const users = await listAssignableAdmins();
    return NextResponse.json({ users });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
