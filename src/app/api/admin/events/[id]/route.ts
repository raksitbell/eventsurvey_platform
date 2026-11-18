import {
  isAuthSession,
  requireAdminSession,
} from "@/core/auth/api-guard";
import { MockApiError } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import {
  formatZodError,
  updateAdminEventBodySchema,
} from "@/core/validation/admin-events";
import { routing, type Locale } from "@/i18n/routing";
import { getAdminEvent, updateAdminEvent } from "@/services/admin/events";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/events/[id] */
export async function GET(request: NextRequest, context: RouteContext) {
  const denied = requireAdminSession(request);
  if (!isAuthSession(denied)) return denied;

  const { id } = await context.params;
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = routing.locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : routing.defaultLocale;

  try {
    const data = await getAdminEvent(id, locale);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Failed to load event" }, { status: 502 });
  }
}

/** PATCH /api/admin/events/[id] — edit draft titles/slug */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const denied = requireAdminSession(request);
  if (!isAuthSession(denied)) return denied;

  const { id } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = updateAdminEventBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = routing.locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : routing.defaultLocale;

  try {
    const data = await updateAdminEvent(
      id,
      parsed.data,
      denied.userId,
      locale,
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MockApiError) {
      const readOnly =
        error.status >= 500 &&
        /EROFS|read-only file system/i.test(error.message);
      return NextResponse.json(
        {
          error: readOnly ? "MOCK_READ_ONLY" : "MOCK_API_ERROR",
          message: error.message,
        },
        { status: readOnly ? 503 : 502 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 502 },
    );
  }
}
