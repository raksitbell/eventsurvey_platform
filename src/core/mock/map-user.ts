import type { MockPermissionCode, MockUser } from "@/types/mock";
import type { User, UserRole, UserStatus } from "@/types/user";

/**
 * Map mock membership → portal `UserRole`.
 * `system_role` + `role_permissions` decide area access (no denormalized
 * `event_role` / `can_*` on users in the current seed).
 */
export function resolveAppRole(
  user: MockUser,
  permissions: readonly MockPermissionCode[] = [],
): UserRole | null {
  if (user.system_role === "platform_admin") return "super_admin";
  if (user.system_role !== "event_user" || !user.event_id) return null;
  // Event Admin roles grant manage_sub_user; narrower roles do not.
  if (permissions.includes("manage_sub_user")) return "event_owner";
  return "sub_user";
}

function mapStatus(status: MockUser["status"]): UserStatus {
  return status === "active" ? "active" : "inactive";
}

/** Bind a mock `/users` row into the app `User` shape (password stripped). */
export function mapMockUserToUser(
  user: MockUser,
  permissions: readonly MockPermissionCode[] = [],
): User | null {
  const role = resolveAppRole(user, permissions);
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
      role === "sub_user" ? user.invited_by_user_id : null,
    canViewSensitiveData: permissions.includes("view_unmasked_pii"),
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
