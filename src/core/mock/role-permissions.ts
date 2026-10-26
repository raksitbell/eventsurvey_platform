import { mockApi } from "@/core/api/mock-client";
import type { MockPermissionCode, MockRolePermission } from "@/types/mock";

/** Load permission codes granted to a role (empty when no role). */
export async function getRolePermissions(
  roleId: string | null | undefined,
): Promise<MockPermissionCode[]> {
  if (!roleId) return [];
  const rows = await mockApi.get<MockRolePermission[]>(
    `/role_permissions?role_id=${encodeURIComponent(roleId)}`,
  );
  return rows.map((row) => row.permission);
}

export function hasPermission(
  permissions: readonly MockPermissionCode[],
  code: MockPermissionCode,
): boolean {
  return permissions.includes(code);
}
