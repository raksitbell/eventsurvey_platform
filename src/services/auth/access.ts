import { mockApi } from "@/core/api/mock-client";
import type { MockRole, MockUser } from "@/types/mock";

/** Bridge current role_permissions resources to the portal's legacy role model. */
export async function bindMockUserAccess(user: MockUser): Promise<MockUser> {
  if (user.system_role === "platform_admin" || user.event_role !== undefined)
    return user;
  if (!user.event_id || !user.role_id) return user;
  const [roles, permissions] = await Promise.all([
    mockApi.get<MockRole[]>(`/roles?id=${encodeURIComponent(user.role_id)}`),
    mockApi.get<{ role_id: string; permission: string }[]>(
      `/role_permissions?role_id=${encodeURIComponent(user.role_id)}`,
    ),
  ]);
  const role = roles.find(
    (r) =>
      r.id === user.role_id && r.event_id === user.event_id && !r.deleted_at,
  );
  if (!role) return user;
  const has = (permission: string) =>
    permissions.some(
      (p) => p.role_id === role.id && p.permission === permission,
    );
  return {
    ...user,
    event_role:
      role.owner_user_id === user.id ? "event_admin" : "event_sub_user",
    can_manage_dashboard: has("manage_dashboard"),
    can_manage_event: has("manage_event"),
    can_manage_registration_form: has("manage_registration_form"),
    can_manage_survey_form: has("manage_survey_form"),
    can_manage_sub_user: has("manage_sub_user"),
    can_approve: has("approve"),
    can_view_unmasked_pii: has("view_unmasked_pii"),
  };
}
