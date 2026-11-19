import { api, ApiError } from "@/core/api/client";
import type { AuthSnapshot } from "@/core/auth/session";
import type { LoginCredentials } from "@/types/auth";
import type { User } from "@/types/user";

const EMPTY_SNAPSHOT: AuthSnapshot = {
  realUser: null,
  impersonatedUser: null,
  inspectedEventId: null,
  inspectedEventName: null,
  canViewOverview: false,
  canViewEvents: false,
  canViewUsers: false,
  canViewActivity: false,
  canInspection: false,
  canManageEvents: false,
};

function normalizeSnapshot(data: Partial<AuthSnapshot>): AuthSnapshot {
  return {
    realUser: data.realUser ?? null,
    impersonatedUser: data.impersonatedUser ?? null,
    inspectedEventId: data.inspectedEventId ?? null,
    inspectedEventName: data.inspectedEventName ?? null,
    canViewOverview: data.canViewOverview === true,
    canViewEvents: data.canViewEvents === true,
    canViewUsers: data.canViewUsers === true,
    canViewActivity: data.canViewActivity === true,
    canInspection: data.canInspection === true,
    canManageEvents: data.canManageEvents === true,
  };
}

export async function loginWithCredentials(
  credentials: LoginCredentials,
): Promise<User> {
  const data = await api.post<{ user: User }>("/auth/login", credentials);
  return data.user;
}

export async function getAuthSnapshot(signal: AbortSignal): Promise<AuthSnapshot> {
  try {
    const data = await api.get<AuthSnapshot>("/auth/session", signal);
    return normalizeSnapshot(data);
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

export async function startEventInspection(eventId: string) {
  const data = await api.post<AuthSnapshot>("/auth/inspect-event", { eventId });
  return normalizeSnapshot(data);
}

export async function endEventInspection() {
  const data = await api.delete<AuthSnapshot>("/auth/inspect-event");
  return normalizeSnapshot(data);
}

/** @deprecated Use startEventInspection — kept for transitional imports. */
export function startImpersonation(_userId: string) {
  return Promise.reject(new Error("IMPERSONATION_REMOVED"));
}

/** @deprecated Use endEventInspection. */
export function endImpersonation() {
  return endEventInspection();
}
