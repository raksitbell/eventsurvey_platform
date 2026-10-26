import type { MockUser } from "@/types/mock";
import type { User, UserRole, UserStatus } from "@/types/user";

/**
 * Map mock membership → portal `UserRole`.
 * `system_role` / `event_role` decide area access; `role_id` is a custom role name only.
 */
export function resolveAppRole(user: MockUser): UserRole | null {
  if (user.system_role === "platform_admin") return "super_admin";
  if (user.event_role === "event_admin") return "event_owner";
  if (user.event_role === "event_sub_user") return "sub_user";
  return null;
}

function mapStatus(status: MockUser["status"]): UserStatus {
  return status === "active" ? "active" : "inactive";
}

/** Bind a mock `/users` row into the app `User` shape (password stripped). */
export function mapMockUserToUser(user: MockUser): User | null {
  const role = resolveAppRole(user);
  if (!role) return null;

  const isRemoved = Boolean(user.removed_at) || user.status === "removed";

  return {
    id: user.id,
    name: user.display_name,
    email: user.email,
    phone: null,
    role,
    status: mapStatus(user.status),
    ownerId:
      user.event_role === "event_sub_user" ? user.invited_by_user_id : null,
    canViewSensitiveData: Boolean(user.can_view_unmasked_pii),
    isDeleted: isRemoved,
    deletedAt: user.removed_at,
    anonymizedAt: null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export function isActiveMockUser(user: MockUser): boolean {
  return user.status === "active" && !user.removed_at;
}
