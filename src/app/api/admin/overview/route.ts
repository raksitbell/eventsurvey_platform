import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import { routing, type Locale } from "@/i18n/routing";
import { getBoundAdminOverview } from "@/services/admin/overview";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(
      session.realUserId,
      "view_platform_overview",
    ))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  try {
    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;
    const data = await getBoundAdminOverview(locale);
    return authJson(data);
  } catch {
    return authJson({ error: "Failed to load overview" }, 502);
  }
}
