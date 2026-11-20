import { PORTAL_ROLES } from "@/core/auth/constants";
import { canAccessPortal } from "@/core/auth/permissions";
import { mockApi } from "@/core/api/mock-client";
import {
  isActiveMockUser,
  mapMockUserToUser,
} from "@/core/mock/map-user";
import { getRolePermissions } from "@/core/mock/role-permissions";
import type { MockUser } from "@/types/mock";
import type { User } from "@/types/user";
import { isPublicDemoLoginBlocked } from "./public-demo";

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

  const users = await mockApi.getFresh<MockUser[]>(`/users?${params.toString()}`);
  const matched = users.find(
    (user) =>
      isActiveMockUser(user) && user.email === email && user.password === password,
  );

  if (!matched || isPublicDemoLoginBlocked(matched)) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  const permissions = await getRolePermissions(matched.id, matched.event_id);
  const user = mapMockUserToUser(matched, permissions);
  if (!user) {
    return { ok: false, error: "UNSUPPORTED_ROLE" };
  }

  if (!canAccessPortal(user.role) || !PORTAL_ROLES.includes(user.role)) {
    return { ok: false, error: "UNSUPPORTED_ROLE" };
  }

  return { ok: true, user };
}
