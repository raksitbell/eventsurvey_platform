import { isAuthSession, requireAdminSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { routing, type Locale } from "@/i18n/routing";
import { getBoundAdminUsers } from "@/services/admin/users";
import { getPlatformPiiViewer } from "@/services/auth/pii-access";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  try {
    const role = request.nextUrl.searchParams.get("role") ?? undefined;
    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;
    const viewer = await getPlatformPiiViewer(session);
    const data = await getBoundAdminUsers(role, locale, viewer);
    return authJson(data);
  } catch {
    return authJson({ error: "Failed to load users" }, 502);
  }
}
