import type { NextRequest } from "next/server";
import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import { routing, type Locale } from "@/i18n/routing";
import { ReportingError } from "@/services/event/reporting";

export async function eventRoute(
  request: NextRequest,
  action: (
    userId: string,
    locale: Locale,
    body?: Record<string, unknown>,
  ) => Promise<unknown>,
) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;

  const isWrite = request.method !== "GET" && request.method !== "HEAD";
  if (session.impersonating && isWrite) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  const body = isWrite ? await readJsonObject(request) : undefined;
  if (body === null) return authJson({ error: "INVALID_REQUEST" }, 400);

  const requested = request.nextUrl.searchParams.get("locale") as Locale;
  const locale = routing.locales.includes(requested)
    ? requested
    : routing.defaultLocale;
  try {
    return authJson(await action(session.userId, locale, body));
  } catch (error) {
    return error instanceof ReportingError
      ? authJson({ error: error.message }, error.status)
      : authJson({ error: "Unable to process event data" }, 502);
  }
}
