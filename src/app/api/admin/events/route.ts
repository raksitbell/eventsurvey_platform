import {
  isAuthSession,
  requireAdminSession,
} from "@/core/auth/api-guard";
import { MockApiError } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import { authJson } from "@/core/auth/route-response";
import { hasPlatformPermission } from "@/core/mock/access";
import {
  createAdminEventBodySchema,
  formatZodError,
} from "@/core/validation/admin-events";
import { routing, type Locale } from "@/i18n/routing";
import {
  createAdminEvent,
  listAdminEvents,
} from "@/services/admin/events";
import { getPlatformPiiViewer } from "@/services/auth/pii-access";
import type { MockEventStatus } from "@/types/mock";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/events */
export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (!isAuthSession(session)) return session;

  if (
    !(await hasPlatformPermission(session.realUserId, "view_all_events"))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  const params = request.nextUrl.searchParams;
  const requestedLocale = params.get("locale");
  const locale = routing.locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : routing.defaultLocale;

  try {
    const viewer = await getPlatformPiiViewer(session);
    const data = await listAdminEvents(
      {
        trash: params.get("trash") === "true",
        q: params.get("q") ?? undefined,
        status: (params.get("status") as MockEventStatus | "all" | null) ?? "all",
        startDate: params.get("startDate") ?? undefined,
        endDate: params.get("endDate") ?? undefined,
        locale,
      },
      viewer,
    );
    return authJson(data);
  } catch {
    return authJson({ error: "Failed to list events" }, 502);
  }
}

/** POST /api/admin/events */
export async function POST(request: NextRequest) {
  const sessionOrDeny = await requireAdminSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  if (
    !(await hasPlatformPermission(
      sessionOrDeny.realUserId,
      "manage_all_events",
    ))
  ) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = createAdminEventBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = routing.locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : routing.defaultLocale;

  try {
    const viewer = await getPlatformPiiViewer(sessionOrDeny);
    const data = await createAdminEvent(
      parsed.data,
      sessionOrDeny.userId,
      locale,
      viewer,
    );
    return authJson(data, 201);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MockApiError) {
      const readOnly =
        error.status >= 500 && /EROFS|read-only file system/i.test(error.message);
      return authJson(
        { error: readOnly ? "MOCK_READ_ONLY" : "MOCK_API_ERROR" },
        readOnly ? 503 : 502,
      );
    }
    return authJson({ error: "Failed to create event" }, 502);
  }
}
