import { api } from "@/core/api";
import type { LoginCredentials } from "@/types/auth";
// noinspection ES6PreferShortImport
import type { User } from "@/types/user";
// noinspection ES6PreferShortImport
import { canImpersonate, isImpersonatableRole } from "./permissions";
// noinspection ES6PreferShortImport
import { sanitizeUser } from "./session";

export async function loginWithCredentials({
  email,
  password,
}: LoginCredentials): Promise<User> {
  try {
    const data = await api.post<{ user: User }>("/auth/login", {
      email,
      password,
    });
    return sanitizeUser(data.user);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        throw new Error("INVALID_CREDENTIALS");
      }
      if (error.message === "UNSUPPORTED_ROLE") {
        throw new Error("UNSUPPORTED_ROLE");
      }
    }
    throw new Error("INVALID_CREDENTIALS");
  }
}

export async function fetchImpersonationTarget(userId: string): Promise<User> {
  const data = await api.get<{ user: User }>(`/admin/users/${userId}`);
  return sanitizeUser(data.user);
}

export function assertCanImpersonate(actor: User, target: User) {
  if (!canImpersonate(actor.role)) {
    throw new Error("FORBIDDEN");
  }
  if (!isImpersonatableRole(target.role)) {
    throw new Error("INVALID_TARGET");
  }
}
