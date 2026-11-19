import { MockApiError, mockApi } from "@/core/api/mock-client";
import { isActiveMockUser, mapMockUserToUser } from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import type { MockUser } from "@/types/mock";

export async function getActivePortalAccount(id: string) {
  if (!id || id === "." || id === "..") return null;
  let mockUser: MockUser;
  try {
    mockUser = await mockApi.get<MockUser>(`/users/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }

  if (!mockUser || mockUser.id !== id || !isActiveMockUser(mockUser)) return null;
  const permissions =
    mockUser.system_role === "event_user"
      ? await getRolePermissions(mockUser.id, mockUser.event_id)
      : [];
  const user = mapMockUserToUser(mockUser, permissions);
  if (!user) return null;

  // platformRoleId kept for session shape; platform checks use user.id → platform_access
  return { user, platformRoleId: mockUser.id };
}
