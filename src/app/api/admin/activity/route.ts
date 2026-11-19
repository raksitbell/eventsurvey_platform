import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import { routing, type Locale } from "@/i18n/routing";
import { listAdminActivity } from "@/services/admin/activity";
import type { AdminActivityFilters } from "@/types/admin/activity";
import type { NextRequest } from "next/server";

function parseIso(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "view_platform_activity"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const params = request.nextUrl.searchParams;
    const requestedLocale = params.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;

    const accountType = params.get("accountType");
    const filters: AdminActivityFilters = {
      eventId: params.get("eventId") || null,
      accountType:
        accountType === "platform" || accountType === "event"
          ? accountType
          : "all",
      startDate: parseIso(params.get("startDate")),
      endDate: parseIso(params.get("endDate")),
      actorUserId: params.get("actorUserId") || null,
    };

    const data = await listAdminActivity(locale, filters);
    return authJson(data);
  } catch {
    return authJson({ error: "Failed to load activity" }, 502);
  }
}
