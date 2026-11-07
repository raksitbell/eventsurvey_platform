import {
  denyUnlessEventPermission,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import {
  formatZodError,
  scheduleEventBodySchema,
} from "@/core/validation/admin-events";
import { routing, type Locale } from "@/i18n/routing";
import { scheduleEvent } from "@/services/admin/events";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/event/workspace/submit-approval
 * Event owner schedules the draft event (draft → scheduled). Path kept for compatibility.
 */
export async function PATCH(request: NextRequest) {
  const sessionOrDeny = requireEventSession(request);
  if (!isAuthSession(sessionOrDeny)) return sessionOrDeny;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = scheduleEventBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(formatZodError(parsed.error), { status: 400 });
  }

  const denied = await denyUnlessEventPermission(
    sessionOrDeny.userId,
    "manage_event",
  );
  if (denied) return denied;

  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = routing.locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : routing.defaultLocale;

  try {
    const data = await scheduleEvent(
      sessionOrDeny.userId,
      {
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        description: parsed.data.description,
        locationName: parsed.data.locationName,
        addressText: parsed.data.addressText,
      },
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
    return NextResponse.json(
      { error: "Failed to schedule event" },
      { status: 502 },
    );
  }
}
