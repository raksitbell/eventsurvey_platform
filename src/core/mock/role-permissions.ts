import { mockApi } from "@/core/api/mock-client";
import type {
  MockPermissionCode,
  MockPlatformPermissionCode,
  MockPlatformRolePermission,
  MockRolePermission,
} from "@/types/mock";

/** Load permission codes granted to a role (empty when no role). */
export async function getRolePermissions(
  roleId: string | null | undefined,
): Promise<MockPermissionCode[]> {
  if (!roleId) return [];
  const rows = await mockApi.get<MockRolePermission[]>(
    `/role_permissions?role_id=${encodeURIComponent(roleId)}`,
  );
  return rows
    .filter((row) => row.role_id === roleId)
    .map((row) => row.permission);
}

export function hasPermission(
  permissions: readonly MockPermissionCode[],
  code: MockPermissionCode,
): boolean {
  return permissions.includes(code);
}

export async function hasPlatformPermission(
  platformRoleId: string | null | undefined,
  permission: MockPlatformPermissionCode,
): Promise<boolean> {
  if (!platformRoleId) return false;
  const rows = await mockApi.get<MockPlatformRolePermission[]>(
    `/platform_role_permissions?platform_role_id=${encodeURIComponent(platformRoleId)}`,
  );
  return rows.some(
    (row) =>
      row.platform_role_id === platformRoleId && row.permission === permission,
  );
}
