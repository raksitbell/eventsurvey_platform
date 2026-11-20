import { getEventAccessForUser } from "@/core/mock/access";
import { MockApiError, mockApi } from "@/core/api/mock-client";
import type { PiiViewer } from "@/core/auth/pii";
import {
  getAdminUserActivity,
  listAdminActivity,
} from "@/services/admin/activity";
import { getPlatformPiiViewer } from "@/services/auth/pii-access";
import { ReportingError } from "@/services/event/reporting";
import type {
  AdminActivityFilters,
  AdminActivityResponse,
  AdminUserActivityProfile,
} from "@/types/admin/activity";
import type { MockEvent, MockUser } from "@/types/mock";
import { routing, type Locale } from "@/i18n/routing";

async function requireEventActivityAccess(
  userId: string,
  inspectedEventId?: string | null,
): Promise<{ eventId: string; viewer: PiiViewer }> {
  const inspected = inspectedEventId?.trim() || null;
  const actor = await mockApi.get<MockUser>(
    `/users/${encodeURIComponent(userId)}`,
  );
  const eventId = inspected || actor?.event_id;
  if (!eventId || (inspected && actor?.system_role !== "platform_admin")) {
    throw new ReportingError(403, "FORBIDDEN");
  }
  const event = await mockApi.getFresh<MockEvent>(`/events/${encodeURIComponent(eventId)}`).catch((error: unknown) => {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  });
  if (!event || event.id !== eventId || event.deleted_at) {
    throw new ReportingError(404, "EVENT_NOT_FOUND");
  }
  if (inspected) {
    return {
      eventId,
      viewer: await getPlatformPiiViewer({ userId, platformRoleId: actor.id }),
    };
  }

  const access = await getEventAccessForUser(actor.id, eventId);
  if (!access.matrix.canViewActivity) {
    throw new ReportingError(403, "FORBIDDEN");
  }
  return {
    eventId,
    viewer: { userId, canViewUnmaskedPii: false },
  };
}

export async function listEventActivity(
  userId: string,
  locale: Locale = routing.defaultLocale,
  filters: Omit<AdminActivityFilters, "eventId" | "accountType"> = {},
  options: { inspectedEventId?: string | null } = {},
): Promise<AdminActivityResponse> {
  const { eventId, viewer } = await requireEventActivityAccess(
    userId,
    options.inspectedEventId,
  );
  const data = await listAdminActivity(
    locale,
    { ...filters, eventId, accountType: "event" },
    viewer,
  );
  return {
    ...data,
    events: data.events.filter((event) => event.id === eventId),
    stats: {
      ...data.stats,
      events: data.stats.total > 0 ? 1 : 0,
      platform: 0,
    },
  };
}

export async function getEventUserActivity(
  requesterId: string,
  targetUserId: string,
  locale: Locale = routing.defaultLocale,
  options: { inspectedEventId?: string | null } = {},
): Promise<AdminUserActivityProfile | null> {
  const { eventId, viewer } = await requireEventActivityAccess(
    requesterId,
    options.inspectedEventId,
  );

  let target: MockUser;
  try {
    target = await mockApi.get<MockUser>(
      `/users/${encodeURIComponent(targetUserId)}`,
    );
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }
  if (!target || target.removed_at) return null;

  const profile = await getAdminUserActivity(
    targetUserId,
    locale,
    { eventId },
    viewer,
  );
  if (!profile) return null;

  const isEventMember = target.event_id === eventId;
  const isPlatformAdmin = target.system_role === "platform_admin";
  // Allow anyone who left an audit trail on this event (e.g. platform actor).
  if (!isEventMember && !isPlatformAdmin && profile.items.length === 0) {
    throw new ReportingError(403, "FORBIDDEN");
  }

  // Event workspace must not expose memberships/permissions from other events.
  return {
    ...profile,
    memberships: profile.memberships.filter(
      (membership) => membership.id === eventId,
    ),
    events: profile.events.filter((event) => event.id === eventId),
  };
}
