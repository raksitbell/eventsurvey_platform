import type { User } from "@/types/user";
import {
  AUTH_STORAGE_KEY,
  IMPERSONATE_STORAGE_KEY,
} from "./constants";
import { writeAuthSessionCookie } from "./cookie";

const AUTH_CHANGE_EVENT = "event-surway-auth";

export type AuthSnapshot = {
  realUser: User | null;
  impersonatedUser: User | null;
};

export function sanitizeUser(user: User): User {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function readStoredUser(key: string): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function writeStoredUser(key: string, user: User | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(sanitizeUser(user)));
}

export function loadAuthStorage(): AuthSnapshot {
  return {
    realUser: readStoredUser(AUTH_STORAGE_KEY),
    impersonatedUser: readStoredUser(IMPERSONATE_STORAGE_KEY),
  };
}

function syncSession(snapshot: AuthSnapshot) {
  writeAuthSessionCookie(snapshot);
  emitAuthChange();
}

export function clearAuthStorage() {
  writeStoredUser(AUTH_STORAGE_KEY, null);
  writeStoredUser(IMPERSONATE_STORAGE_KEY, null);
  syncSession({ realUser: null, impersonatedUser: null });
}

export function persistAuthStorage(
  realUser: User | null,
  impersonatedUser: User | null,
) {
  writeStoredUser(AUTH_STORAGE_KEY, realUser);
  writeStoredUser(IMPERSONATE_STORAGE_KEY, impersonatedUser);
  syncSession({ realUser, impersonatedUser });
}

/** Call after reading localStorage so middleware cookie matches the client session */
export function hydrateAuthSession() {
  const snapshot = loadAuthStorage();
  writeAuthSessionCookie(snapshot);
  return snapshot;
}

export function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function subscribeAuth(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  queueMicrotask(onStoreChange);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
