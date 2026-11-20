import {
  isAuthSession,
  requireAdminSession,
} from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { listAssignableAdmins } from "@/services/admin/events";
import { getPlatformPiiViewer } from "@/services/auth/pii-access";
import type { NextRequest } from "next/server";

/** GET /api/admin/events/assignable-users */
export async function GET(request: NextRequest) {
  const denied = await requireAdminSession(request);
  if (!isAuthSession(denied)) return denied;

  try {
    const viewer = await getPlatformPiiViewer(denied);
    const users = await listAssignableAdmins(viewer);
    return authJson({ users });
  } catch {
    return authJson({ error: "Failed to load users" }, 502);
  }
}
