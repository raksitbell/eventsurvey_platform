import { api, ApiError } from "@/core/api/client";
import type { LoginCredentials } from "@/types/auth";
import type { User } from "@/types/user";
import type { AuthSnapshot } from "./session";

export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<User> {
  const data = await api.post<{ user: User }>("/auth/login", credentials);
  return data.user;
}

export async function getAuthSnapshot(signal: AbortSignal): Promise<AuthSnapshot> {
  try {
    return await api.get<AuthSnapshot>("/auth/session", signal);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { realUser: null, impersonatedUser: null };
    }
    throw error;
  }
}

export function signOut() {
  return api.post<void>("/auth/logout", {});
}

export function startImpersonation(userId: string) {
  return api.post<AuthSnapshot>("/auth/impersonation", { userId });
}

export function endImpersonation() {
  return api.delete<AuthSnapshot>("/auth/impersonation");
}
