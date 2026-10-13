import { mockApi } from "@/core/api/mock-client";
import type { EventWorkspace } from "@/types/event/workspace";
import type { MockEvent, MockEventUser, MockRole } from "@/types/mock";
import type { User } from "@/types/user";

/** Resolve the single event workspace for an event_owner or sub_user */
export async function getEventWorkspace(
  userId: string,
): Promise<EventWorkspace | null> {
  const user = await mockApi.get<User>(`/users/${userId}`);
  if (!user || user.isDeleted || user.status !== "active") return null;

  if (user.role === "event_owner") {
    const events = await mockApi.get<MockEvent[]>(
      `/events?ownerId=${userId}&isDeleted=false`,
    );
    const event = events[0];
    if (!event) return null;
    return {
      eventId: event.id,
      eventName: event.name,
      eventStatus: event.status,
      userRole: user.role,
      customRoleName: null,
    };
  }

  if (user.role === "sub_user") {
    const assignments = await mockApi.get<MockEventUser[]>(
      `/event_users?userId=${userId}&isDeleted=false&status=active`,
    );
    const assignment = assignments[0];
    if (!assignment) return null;

    const [event, roles] = await Promise.all([
      mockApi.get<MockEvent>(`/events/${assignment.eventId}`),
      mockApi.get<MockRole[]>(`/roles?isDeleted=false`),
    ]);

    if (!event || event.isDeleted) return null;

    const customRoleName =
      roles.find((role) => role.id === assignment.roleId)?.name ?? null;

    return {
      eventId: event.id,
      eventName: event.name,
      eventStatus: event.status,
      userRole: user.role,
      customRoleName,
    };
  }

  return null;
}
