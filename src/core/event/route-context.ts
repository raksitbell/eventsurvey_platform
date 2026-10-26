import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  parseAuthSessionCookie,
} from "@/core/auth/cookie";
import { canEnterEventArea } from "@/core/auth/permissions";
import { routing, type Locale } from "@/i18n/routing";
import { ReportingError } from "@/services/event/reporting";
export async function eventRoute(
  request: NextRequest,
  action: (userId: string, locale: Locale) => Promise<unknown>,
) {
  try {
    const session = parseAuthSessionCookie(
      request.cookies.get(AUTH_SESSION_COOKIE)?.value,
    );
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (
      !canEnterEventArea(session.role, session.realRole, session.impersonating)
    )
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const requested = request.nextUrl.searchParams.get("locale") as Locale;
    const locale = routing.locales.includes(requested)
      ? requested
      : routing.defaultLocale;
    return NextResponse.json(await action(session.userId, locale));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ReportingError
            ? error.message
            : "Unable to process event data",
      },
      {
        status:
          error instanceof ReportingError
            ? error.status
            : error instanceof SyntaxError
              ? 400
              : 502,
      },
    );
  }
}
