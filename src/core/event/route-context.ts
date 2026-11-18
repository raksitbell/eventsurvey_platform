import { NextResponse, type NextRequest } from "next/server";
import { acceptsJson } from "@/core/auth/route-response";
import {
  VerifiedSessionError,
  verifiedActor,
} from "@/core/auth/verified-session";
import { routing, type Locale } from "@/i18n/routing";
import { ReportingError } from "@/services/event/reporting";

const responseHeaders = { "Cache-Control": "private, no-store" };

export async function eventRoute(
  request: NextRequest,
  action: (userId: string, locale: Locale) => Promise<unknown>,
) {
  try {
    const { user, impersonating } = await verifiedActor(request);
    const isWrite = request.method !== "GET" && request.method !== "HEAD";
    if (
      user.system_role !== "event_user" ||
      !user.event_id ||
      (impersonating && isWrite)
    ) {
      return NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403, headers: responseHeaders },
      );
    }
    if (isWrite && !acceptsJson(request)) {
      return NextResponse.json(
        { error: "INVALID_REQUEST" },
        { status: 400, headers: responseHeaders },
      );
    }

    const requested = request.nextUrl.searchParams.get("locale") as Locale;
    const locale = routing.locales.includes(requested)
      ? requested
      : routing.defaultLocale;
    return NextResponse.json(await action(user.id, locale), {
      headers: responseHeaders,
    });
  } catch (error) {
    const domainError =
      error instanceof ReportingError || error instanceof VerifiedSessionError;
    return NextResponse.json(
      {
        error: domainError ? error.message : "Unable to process event data",
      },
      {
        status: domainError
          ? error.status
          : error instanceof SyntaxError
            ? 400
            : 502,
        headers: responseHeaders,
      },
    );
  }
}
