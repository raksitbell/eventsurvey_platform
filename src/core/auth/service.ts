import { api, ApiError } from "@/core/api/client";
import type { AuthSnapshot } from "@/core/auth/session";
import type { LoginCredentials } from "@/types/auth";
import type { User } from "@/types/user";

const EMPTY_SNAPSHOT: AuthSnapshot = {
  realUser: null,
  impersonatedUser: null,
  inspectedEventId: null,
  inspectedEventName: null,
};

export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<User> {
  const data = await api.post<{ user: User }>("/auth/login", credentials);
  return data.user;
}

export async function getAuthSnapshot(signal: AbortSignal): Promise<AuthSnapshot> {
  try {
    const data = await api.get<AuthSnapshot>("/auth/session", signal);
    return {
      realUser: data.realUser,
      impersonatedUser: data.impersonatedUser ?? null,
      inspectedEventId: data.inspectedEventId ?? null,
      inspectedEventName: data.inspectedEventName ?? null,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return EMPTY_SNAPSHOT;
    }
    throw error;
  }
}

export function signOut() {
  return api.post<void>("/auth/logout", {});
}

export function startEventInspection(eventId: string) {
  return api.post<AuthSnapshot>("/auth/inspect-event", { eventId });
}

export function endEventInspection() {
  return api.delete<AuthSnapshot>("/auth/inspect-event");
}

/** @deprecated Use startEventInspection — kept for transitional imports. */
export function startImpersonation(_userId: string) {
  return Promise.reject(new Error("IMPERSONATION_REMOVED"));
}

/** @deprecated Use endEventInspection. */
export function endImpersonation() {
  return endEventInspection();
}
