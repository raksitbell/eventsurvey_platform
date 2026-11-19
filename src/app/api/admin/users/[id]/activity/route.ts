import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import { routing, type Locale } from "@/i18n/routing";
import { getAdminUserActivity } from "@/services/admin/activity";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "view_platform_activity"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const { id } = await context.params;
    const params = request.nextUrl.searchParams;
    const requestedLocale = params.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;

    const profile = await getAdminUserActivity(id, locale, {
      eventId: params.get("eventId") || null,
    });
    if (!profile) return authJson({ error: "USER_NOT_FOUND" }, 404);
    return authJson(profile);
  } catch {
    return authJson({ error: "Failed to load user activity" }, 502);
  }
}
