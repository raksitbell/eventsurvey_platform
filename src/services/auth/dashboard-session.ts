import { MockApiError, mockApi } from "@/core/api/mock-client";
import { isActiveMockUser } from "@/core/mock/map-user";
import type { MockUser } from "@/types/mock";

export async function getActiveDashboardAccount(id: string) {
  if (!id || id === "." || id === "..") return null;

  let account: MockUser;
  try {
    account = await mockApi.get<MockUser>(`/users/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }
  return account?.id === id && isActiveMockUser(account) ? account : null;
}
