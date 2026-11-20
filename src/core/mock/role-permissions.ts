import {
  eventMatrixToLegacyCodes,
  getEventAccessForUser,
  hasPlatformPermission as hasPlatformAccessPermission,
} from "@/core/mock/access";
import type {
  MockPermissionCode,
  MockPlatformPermissionCode,
} from "@/types/mock";

/**
 * Load legacy manage_* codes derived from `event_access` for a user.
 * Prefer `getEventAccessForUser` for new call sites.
 */
export async function getRolePermissions(
  userId: string | null | undefined,
  eventId?: string | null,
): Promise<MockPermissionCode[]> {
  if (!userId) return [];
  const access = await getEventAccessForUser(userId, eventId);
  return eventMatrixToLegacyCodes(access.matrix, access.canManageSubUsers);
}

export function hasPermission(
  permissions: readonly MockPermissionCode[],
  code: MockPermissionCode,
): boolean {
  return permissions.includes(code);
}

/** Platform checks now key off `platform_access.user_id`. */
export async function hasPlatformPermission(
  userId: string | null | undefined,
  permission: MockPlatformPermissionCode,
): Promise<boolean> {
  return hasPlatformAccessPermission(userId, permission);
}
