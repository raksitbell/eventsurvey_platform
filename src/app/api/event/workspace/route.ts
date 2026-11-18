import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { routing, type Locale } from "@/i18n/routing";
import { getEventWorkspace } from "@/services/event/workspace";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;

  try {
    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;
    const data = await getEventWorkspace(session.userId, locale);
    if (!data) {
      return authJson({ error: "Workspace not found" }, 404);
    }

    return authJson(data);
  } catch {
    return authJson({ error: "Failed to load workspace" }, 502);
  }
}
