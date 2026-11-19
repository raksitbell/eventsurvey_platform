import { NextResponse, type NextRequest } from "next/server";
import { requirePortalSession } from "@/core/auth/api-guard";
import { isInspectingEvent, readAuthSession } from "@/core/auth/cookie";
import { projectUserPii } from "@/core/auth/pii";
import { authJson, rejectSession } from "@/core/auth/route-response";
import { MockApiError, mockApi } from "@/core/api/mock-client";
import type { MockEvent, MockEventTranslation } from "@/types/mock";

async function loadInspectedEventName(
  eventId: string | null,
): Promise<string | null> {
  if (!eventId) return null;
  try {
    const [event, translations] = await Promise.all([
      mockApi.get<MockEvent>(`/events/${encodeURIComponent(eventId)}`),
      mockApi.get<MockEventTranslation[]>(
        `/event_translations?event_id=${encodeURIComponent(eventId)}`,
      ),
    ]);
    if (!event || event.deleted_at) return null;
    const preferred =
      translations.find((row) => row.locale_code === event.default_locale) ??
      translations[0];
    return preferred?.title ?? event.slug;
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requirePortalSession(readAuthSession(request));
  if (auth instanceof NextResponse) {
    return auth.status === 401 ? rejectSession(request) : auth;
  }

  const inspectedEventId = isInspectingEvent(auth.session)
    ? auth.session.inspectedEventId
    : null;

  let inspectedEventName: string | null = null;
  try {
    inspectedEventName = await loadInspectedEventName(inspectedEventId);
  } catch {
    return authJson({ error: "SESSION_UNAVAILABLE" }, 503);
  }

  return authJson({
    realUser: projectUserPii(auth.realAccount.user, true),
    impersonatedUser: auth.impersonatedUser
      ? projectUserPii(auth.impersonatedUser, false)
      : null,
    inspectedEventId,
    inspectedEventName,
  });
}
