import type { NextRequest } from "next/server";
import { analyticsFailure } from "@/core/analytics/http";
import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { getAnalytics } from "@/services/event/analytics";

export async function GET(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;

  try {
    return authJson(await getAnalytics(request, session));
  } catch (error) {
    return analyticsFailure(error);
  }
}
