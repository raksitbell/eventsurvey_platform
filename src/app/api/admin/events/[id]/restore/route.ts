import { ServiceError } from "@/core/api/service-error";
import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import { restoreAdminEvent } from "@/services/admin/events";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  try {
    if (!(await hasPlatformPermission(session.realUserId, "manage_all_events"))) {
      return authJson({ error: "FORBIDDEN" }, 403);
    }
    const { id } = await context.params;
    return authJson(await restoreAdminEvent(id, session.realUserId));
  } catch (error) {
    if (error instanceof ServiceError) return authJson({ error: error.code }, error.status);
    return authJson({ error: "EVENT_RESTORE_FAILED" }, 502);
  }
}
