import {
  AUTH_SESSION_COOKIE,
  parseAuthSessionCookie,
} from "@/core/auth/cookie";
import { canEnterEventArea } from "@/core/auth/permissions";
import { routing, type Locale } from "@/i18n/routing";
import { getEventWorkspace } from "@/services/event/workspace";
import { NextRequest, NextResponse } from "next/server";

/**
 * BR-008 / DR-007: the API layer decides who may read this. The identity comes
 * from the session cookie, never from a caller-supplied id — `?userId=N` let
 * anyone read anyone else's workspace by changing the number.
 */
export async function GET(request: NextRequest) {
  try {
    const session = parseAuthSessionCookie(
      request.cookies.get(AUTH_SESSION_COOKIE)?.value,
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      !canEnterEventArea(session.role, session.realRole, session.impersonating)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestedLocale = request.nextUrl.searchParams.get("locale");
    const locale = routing.locales.includes(requestedLocale as Locale)
      ? (requestedLocale as Locale)
      : routing.defaultLocale;
    const data = await getEventWorkspace(session.userId, locale);
    if (!data) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load workspace";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
