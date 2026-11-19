import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { isInspectingEvent } from "@/core/auth/cookie";
import { authJson } from "@/core/auth/route-response";
import { routing, type Locale } from "@/i18n/routing";
import { getEventUserActivity } from "@/services/event/activity";
import { ReportingError } from "@/services/event/reporting";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;

  try {
    const { id } = await context.params;
    const params = request.nextUrl.searchParams;
    const requestedLocale = params.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;

    const profile = await getEventUserActivity(session.userId, id, locale, {
      inspectedEventId: isInspectingEvent(session)
        ? session.inspectedEventId
        : null,
    });
    if (!profile) return authJson({ error: "USER_NOT_FOUND" }, 404);
    return authJson(profile);
  } catch (error) {
    if (error instanceof ReportingError) {
      return authJson({ error: error.message }, error.status);
    }
    return authJson({ error: "Failed to load user activity" }, 502);
  }
}
