import { bindMockUserAccess } from "@/services/auth/access";
import { PORTAL_ROLES } from "@/core/auth/constants";
import { canAccessPortal } from "@/core/auth/permissions";
import { sanitizeUser } from "@/core/auth/session";
import { mockApi } from "@/core/api/mock-client";
import { isActiveMockUser, mapMockUserToUser } from "@/core/mock/map-user";
import type { MockUser } from "@/types/mock";
import type { User } from "@/types/user";

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: "INVALID_CREDENTIALS" | "UNSUPPORTED_ROLE" };

export async function loginWithMockCredentials(
  email: string,
  password: string,
): Promise<LoginResult> {
  const params = new URLSearchParams({
    email,
    password,
    status: "active",
  });

  const users = await mockApi.get<MockUser[]>(`/users?${params.toString()}`);
  const matched = users.find(isActiveMockUser);

  if (!matched) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  const user = mapMockUserToUser(await bindMockUserAccess(matched));
  if (!user) {
    return { ok: false, error: "UNSUPPORTED_ROLE" };
  }

  if (!canAccessPortal(user.role) || !PORTAL_ROLES.includes(user.role)) {
    return { ok: false, error: "UNSUPPORTED_ROLE" };
  }

  return { ok: true, user: sanitizeUser(user) };
}
