import {
  isAuthSession,
  requireAdminSession,
} from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import {
  createAdminEventBodySchema,
  formatZodError,
} from "@/core/validation/admin-events";
import { routing, type Locale } from "@/i18n/routing";
import {
  createAdminEvent,
  listAdminEvents,
} from "@/services/admin/events";
import type { MockEventStatus } from "@/types/mock";
import { NextRequest, NextResponse } from "next/server";

/** GET /api/admin/events */
export async function GET(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (!isAuthSession(denied)) return denied;

  const params = request.nextUrl.searchParams;
  const requestedLocale = params.get("locale");
  const locale = routing.locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : routing.defaultLocale;

  try {
    const data = await listAdminEvents({
      q: params.get("q") ?? undefined,
      status: (params.get("status") as MockEventStatus | "all" | null) ?? "all",
      startDate: params.get("startDate") ?? undefined,
      endDate: params.get("endDate") ?? undefined,
      locale,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list events";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/** POST /api/admin/events */
export async function POST(request: NextRequest) {
  const sessionOrDeny = requireAdminSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

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
    const data = await createAdminEvent(
      parsed.data,
      sessionOrDeny.userId,
      locale,
    );
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
