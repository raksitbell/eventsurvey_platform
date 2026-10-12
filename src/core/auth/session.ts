import type { User } from "@/types/user";
import { AUTH_STORAGE_KEY, IMPERSONATE_STORAGE_KEY } from "./constants";

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

export function clearAuthStorage() {
  writeStoredUser(AUTH_STORAGE_KEY, null);
  writeStoredUser(IMPERSONATE_STORAGE_KEY, null);
}

export function loadAuthStorage() {
  return {
    realUser: readStoredUser(AUTH_STORAGE_KEY),
    impersonatedUser: readStoredUser(IMPERSONATE_STORAGE_KEY),
  };
}

export function persistAuthStorage(
  realUser: User,
  impersonatedUser: User | null,
) {
  writeStoredUser(AUTH_STORAGE_KEY, realUser);
  writeStoredUser(IMPERSONATE_STORAGE_KEY, impersonatedUser);
}
