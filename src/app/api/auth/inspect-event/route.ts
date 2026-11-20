import { NextResponse, type NextRequest } from "next/server";
import { requireSessionActor } from "@/core/auth/api-guard";
import {
  isLegacyImpersonation,
  readAuthSession,
  setAuthSessionCookie,
} from "@/core/auth/cookie";
import { canEnterAdminArea } from "@/core/auth/permissions";
import { projectUserPii } from "@/core/auth/pii";
import {
  authJson,
  readJsonObject,
  rejectCrossOrigin,
} from "@/core/auth/route-response";
import { MockApiError, mockApi } from "@/core/api/mock-client";
import {
  getPlatformAccessForUser,
  platformSessionFlags,
} from "@/core/mock/access";
import { hasPlatformPermission } from "@/core/mock/role-permissions";
import type { MockEvent, MockEventTranslation } from "@/types/mock";

async function resolveEventTitle(eventId: string): Promise<string | null> {
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

/** POST — platform admin starts inspecting an event workspace (full access). */
export async function POST(request: NextRequest) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const auth = await requireSessionActor(readAuthSession(request));
  if (auth instanceof NextResponse) return auth;
  if (!canEnterAdminArea(auth.session.realRole, isLegacyImpersonation(auth.session))) {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  const body = await readJsonObject(request);
  const eventId = typeof body?.eventId === "string" ? body.eventId.trim() : "";
  if (!eventId) return authJson({ error: "INVALID_TARGET" }, 400);

  try {
    const { realAccount, session } = auth;
    if (
      !(await hasPlatformPermission(session.realUserId, "inspect_event"))
    ) {
      return authJson({ error: "FORBIDDEN" }, 403);
    }

    const eventTitle = await resolveEventTitle(eventId);
    if (!eventTitle) return authJson({ error: "INVALID_TARGET" }, 404);

    const flags = platformSessionFlags(
      await getPlatformAccessForUser(session.realUserId),
    );
    const response = authJson({
      realUser: projectUserPii(realAccount.user, true),
      impersonatedUser: null,
      inspectedEventId: eventId,
      inspectedEventName: eventTitle,
      ...flags,
    });
    setAuthSessionCookie(
      response,
      {
        realUserId: session.realUserId,
        userId: session.realUserId,
        realRole: session.realRole,
        role: session.realRole,
        inspectedEventId: eventId,
      },
      session.expiresAt,
    );
    return response;
  } catch {
    return authJson({ error: "SESSION_UNAVAILABLE" }, 503);
  }
}

/** DELETE — leave the inspected event and return to the platform admin session. */
export async function DELETE(request: NextRequest) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const auth = await requireSessionActor(readAuthSession(request));
  if (auth instanceof NextResponse) return auth;
  const { realAccount, session } = auth;
  if (session.realRole !== "super_admin") {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  const flags = platformSessionFlags(
    await getPlatformAccessForUser(session.realUserId),
  );
  const response = authJson({
    realUser: projectUserPii(realAccount.user, true),
    impersonatedUser: null,
    inspectedEventId: null,
    inspectedEventName: null,
    ...flags,
  });
  if (session.inspectedEventId || isLegacyImpersonation(session)) {
    setAuthSessionCookie(
      response,
      {
        realUserId: session.realUserId,
        userId: session.realUserId,
        realRole: session.realRole,
        role: session.realRole,
        inspectedEventId: null,
      },
      session.expiresAt,
    );
  }
  return response;
}
