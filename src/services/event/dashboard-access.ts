import { mockApi } from "@/core/api/mock-client";
import { canUseEventDashboard } from "@/core/event/dashboard-policy";
import { getRolePermissions } from "@/core/mock/role-permissions";
import type { MockEvent, MockFormType, MockRole, MockUser } from "@/types/mock";

interface DashboardScope {
  event: MockEvent;
  canReadForm: (type: MockFormType) => boolean;
}

export async function getDashboardScope(
  userId: string,
): Promise<DashboardScope | null> {
  const users = await mockApi.get<MockUser[]>(
    `/users?id=${encodeURIComponent(userId)}`,
  );
  const user = users.find((row) => row.id === userId);
  if (
    !user ||
    user.status !== "active" ||
    user.removed_at ||
    user.system_role !== "event_user" ||
    !user.event_id ||
    !user.role_id
  ) {
    return null;
  }

  const [events, roles, permissions] = await Promise.all([
    mockApi.get<MockEvent[]>(`/events?id=${encodeURIComponent(user.event_id)}`),
    mockApi.get<MockRole[]>(`/roles?id=${encodeURIComponent(user.role_id)}`),
    getRolePermissions(user.role_id),
  ]);
  const event = events.find(
    (row) => row.id === user.event_id && !row.deleted_at,
  );
  const role = roles.find(
    (row) =>
      row.id === user.role_id && row.event_id === event?.id && !row.deleted_at,
  );

  if (!event || !role || !canUseEventDashboard(event.status, permissions)) {
    return null;
  }

  return {
    event,
    canReadForm: (type) =>
      type === "registration"
        ? permissions.includes("manage_registration_form")
        : type === "survey" && permissions.includes("manage_survey_form"),
  };
}
