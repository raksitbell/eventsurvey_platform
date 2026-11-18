import type { NextRequest } from "next/server";
import { analyticsFailure } from "@/core/analytics/http";
import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { saveAnalyticsLayout } from "@/services/event/analytics";

export async function PATCH(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;
  if (session.impersonating) return authJson({ error: "FORBIDDEN" }, 403);

  try {
    return authJson(await saveAnalyticsLayout(request, session));
  } catch (error) {
    return analyticsFailure(error);
  }
}
