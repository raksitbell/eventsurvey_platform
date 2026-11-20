import { api, ApiError } from "@/core/api/client";
import { EMPTY_AUTH_SNAPSHOT, type AuthSnapshot } from "@/core/auth/session";
import type { LoginCredentials } from "@/types/auth";
import type { User } from "@/types/user";

type SessionResponse = Partial<Omit<AuthSnapshot, "user">> & {
  impersonatedUser?: User | null;
};

function normalizeSnapshot(data: SessionResponse): AuthSnapshot {
  const realUser = data.realUser ?? null;
  return {
    realUser,
    user: realUser && (data.impersonatedUser ?? realUser),
    inspectedEventId: data.inspectedEventId ?? null,
    inspectedEventName: data.inspectedEventName ?? null,
    canViewOverview: data.canViewOverview === true,
    canViewEvents: data.canViewEvents === true,
    canViewUsers: data.canViewUsers === true,
    canManageUsers: data.canManageUsers === true,
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
    const data = await api.get<SessionResponse>("/auth/session", signal);
    return normalizeSnapshot(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return EMPTY_AUTH_SNAPSHOT;
    }
    throw error;
  }
}

export function signOut() {
  return api.post<void>("/auth/logout", {});
}

export async function startEventInspection(eventId: string) {
  const data = await api.post<SessionResponse>("/auth/inspect-event", { eventId });
  return normalizeSnapshot(data);
}

export async function endEventInspection() {
  const data = await api.delete<SessionResponse>("/auth/inspect-event");
  return normalizeSnapshot(data);
}
