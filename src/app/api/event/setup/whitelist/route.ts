import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { isInspectingEvent } from "@/core/auth/cookie";
import { authJson } from "@/core/auth/route-response";
import { setupRevisionSchema } from "@/core/event/setup-state";
import { whitelistEntriesSchema } from "@/core/event/whitelist";
import { routing, type Locale } from "@/i18n/routing";
import {
  getSetupContext,
  getSetupWhitelist,
  updateSetupWhitelist,
} from "@/services/event/setup";
import { setupErrorResponse } from "@/services/event/setup-response";
import type { NextRequest } from "next/server";
import { z } from "zod";

const updateSchema = z.strictObject({
  eventId: z.string().min(1).max(128),
  revision: setupRevisionSchema,
  entries: whitelistEntriesSchema,
});

function requestLocale(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  return routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale;
}

function inspectOptions(session: {
  inspectedEventId: string | null;
  impersonating: boolean;
  realRole: string;
}) {
  return {
    inspectedEventId: isInspectingEvent(session)
      ? session.inspectedEventId
      : null,
  };
}

export async function GET(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;

  try {
    const context = await getSetupContext(
      session.userId,
      requestLocale(request),
      inspectOptions(session),
    );
    if (request.nextUrl.searchParams.get("eventId") !== context.event.id) {
      return authJson({ error: "SETUP_EVENT_CHANGED" }, 409);
    }
    const result = await getSetupWhitelist(context);
    return authJson(result);
  } catch (error) {
    return setupErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return authJson({ error: "VALIDATION_ERROR" }, 400);

  try {
    const context = await getSetupContext(
      session.userId,
      requestLocale(request),
      inspectOptions(session),
    );
    if (parsed.data.eventId !== context.event.id) {
      return authJson({ error: "SETUP_EVENT_CHANGED" }, 409);
    }
    const result = await updateSetupWhitelist(context, parsed.data);
    return authJson(result);
  } catch (error) {
    return setupErrorResponse(error);
  }
}
