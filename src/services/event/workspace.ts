import { mockApi } from "@/core/api/mock-client";
import { resolveEventTitle } from "@/core/mock/event-title";
import {
  isActiveMockUser,
  mapMockUserToUser,
} from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import { routing, type Locale } from "@/i18n/routing";
import type { EventWorkspace } from "@/types/event/workspace";
import type {
  MockEvent,
  MockEventTranslation,
  MockRole,
  MockUser,
} from "@/types/mock";

/** Resolve the single event workspace for an event_owner or sub_user */
export async function getEventWorkspace(
  userId: string,
  locale: Locale = routing.defaultLocale,
): Promise<EventWorkspace | null> {
  const mockUser = await mockApi.get<MockUser>(`/users/${userId}`);
  if (!mockUser || !isActiveMockUser(mockUser)) return null;

  const permissions = await getRolePermissions(mockUser.role_id);
  const user = mapMockUserToUser(mockUser, permissions);
  if (!user || (user.role !== "event_owner" && user.role !== "sub_user")) {
    return null;
  }

  const eventId = mockUser.event_id;
  if (!eventId) return null;

  const [event, translations, roles] = await Promise.all([
    mockApi.get<MockEvent>(`/events/${eventId}`),
    mockApi.get<MockEventTranslation[]>(
      `/event_translations?event_id=${encodeURIComponent(eventId)}`,
    ),
    mockUser.role_id
      ? mockApi.get<MockRole[]>(
          `/roles?id=${encodeURIComponent(mockUser.role_id)}`,
        )
      : Promise.resolve([] as MockRole[]),
  ]);

  if (!event || event.deleted_at) return null;

  const eventName =
    resolveEventTitle(translations, eventId, locale) ?? event.slug;

  const customRole =
    user.role === "sub_user" && mockUser.role_id
      ? (roles.find((role) => role.id === mockUser.role_id) ?? null)
      : null;

  return {
    eventId: event.id,
    eventName,
    eventStatus: event.status,
    userRole: user.role,
    customRoleName: customRole?.name ?? null,
  };
}
