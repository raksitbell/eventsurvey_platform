import { mockApi } from "@/core/api/mock-client";
import { PORTAL_ROLES } from "@/core/auth/constants";
import { canAccessPortal } from "@/core/auth/permissions";
import { sanitizeUser } from "@/core/auth/session";
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
    isDeleted: "false",
  });

  const users = await mockApi.get<User[]>(`/users?${params.toString()}`);
  const matched = users[0];

  if (!matched) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  if (!canAccessPortal(matched.role) || !PORTAL_ROLES.includes(matched.role)) {
    return { ok: false, error: "UNSUPPORTED_ROLE" };
  }

  return { ok: true, user: sanitizeUser(matched) };
}
