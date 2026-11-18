import type { NextRequest } from "next/server";
import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { ServiceError } from "@/core/api/service-error";
import { getAssignedShareLinks } from "@/services/event/public-event";

export async function GET(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;
  if (session.role !== "event_owner") {
    return authJson({ error: "FORBIDDEN" }, 403);
  }
  try {
    const share = await getAssignedShareLinks(session.userId);
    return authJson(share);
  } catch (error) {
    const status =
      error instanceof ServiceError && error.status === 403 ? 403 : 502;
    return authJson(
      { error: status === 403 ? "FORBIDDEN" : "SHARE_LINKS_UNAVAILABLE" },
      status,
    );
  }
}
