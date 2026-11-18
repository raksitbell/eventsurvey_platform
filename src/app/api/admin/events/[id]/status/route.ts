import {
  isAuthSession,
  requireAdminSession,
} from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import {
  adminEventStatusBodySchema,
  formatZodError,
} from "@/core/validation/admin-events";
import { routing, type Locale } from "@/i18n/routing";
import { updateAdminEventStatus } from "@/services/admin/events";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/admin/events/[id]/status — start (scheduled→open) or close */
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

  const parsed = adminEventStatusBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = routing.locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : routing.defaultLocale;

  try {
    const data = await updateAdminEventStatus(
      id,
      parsed.data.action,
      denied.userId,
      locale,
      { force: parsed.data.force },
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          ...(error.details && typeof error.details === "object"
            ? error.details
            : {}),
        },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 502 },
    );
  }
}
