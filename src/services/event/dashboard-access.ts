import { MockApiError, mockApi } from "@/core/api/mock-client";
import {
  DEFAULT_ADMIN_MATRIX,
  formPermissionModule,
  satisfiesAccessLevel,
} from "@/core/auth/event-permissions";
import { canAccessEventDashboard } from "@/core/event/dashboard-policy";
import { getEventAccessForUser } from "@/core/mock/access";
import type { MockEvent, MockFormType, MockUser } from "@/types/mock";

interface DashboardScope {
  event: MockEvent;
  canReadForm: (type: MockFormType) => boolean;
  canManageForm: (type: MockFormType) => boolean;
  canManageDashboard: boolean;
  canViewSubmissions: boolean;
  canExport: boolean;
}

function scopeFromMatrix(
  event: MockEvent,
  matrix: typeof DEFAULT_ADMIN_MATRIX,
): DashboardScope {
  return {
    event,
    canViewSubmissions: matrix.canViewSubmissions,
    canExport: matrix.canExport,
    canManageDashboard: satisfiesAccessLevel(matrix.dashboard, "can_edit"),
    canReadForm: (type) =>
      type === "registration" || type === "survey"
        ? satisfiesAccessLevel(
            matrix[formPermissionModule(type)],
            "view_only",
          )
        : false,
    canManageForm: (type) =>
      type === "registration" || type === "survey"
        ? satisfiesAccessLevel(matrix[formPermissionModule(type)], "can_edit")
        : false,
  };
}

export async function getDashboardScope(
  userId: string,
  options: { inspectedEventId?: string | null } = {},
): Promise<DashboardScope | null> {
  const inspectedEventId = options.inspectedEventId?.trim() || null;
  if (inspectedEventId) {
    try {
      const [user, events] = await Promise.all([
        mockApi.get<MockUser>(`/users/${encodeURIComponent(userId)}`),
        mockApi.get<MockEvent[]>(
          `/events?id=${encodeURIComponent(inspectedEventId)}`,
        ),
      ]);
      if (
        !user ||
        user.id !== userId ||
        user.status !== "active" ||
        user.removed_at ||
        user.system_role !== "platform_admin"
      ) {
        return null;
      }
      const event = events.find(
        (row) => row.id === inspectedEventId && !row.deleted_at,
      );
      if (
        !event ||
        !canAccessEventDashboard(event.status, "can_edit", "view_only")
      ) {
        return null;
      }
      return scopeFromMatrix(event, DEFAULT_ADMIN_MATRIX);
    } catch (error) {
      if (error instanceof MockApiError && error.status === 404) return null;
      throw error;
    }
  }

  let user: MockUser;
  try {
    user = await mockApi.get<MockUser>(`/users/${encodeURIComponent(userId)}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }
  if (
    !user ||
    user.id !== userId ||
    user.status !== "active" ||
    user.removed_at ||
    user.system_role !== "event_user" ||
    !user.event_id
  ) {
    return null;
  }

  const [events, access] = await Promise.all([
    mockApi.get<MockEvent[]>(`/events?id=${encodeURIComponent(user.event_id)}`),
    getEventAccessForUser(user.id, user.event_id),
  ]);
  const event = events.find(
    (row) => row.id === user.event_id && !row.deleted_at,
  );

  if (!event || !access.row) {
    return null;
  }

  const matrix = access.matrix;
  if (!canAccessEventDashboard(event.status, matrix.dashboard, "view_only")) {
    return null;
  }

  return scopeFromMatrix(event, matrix);
}
