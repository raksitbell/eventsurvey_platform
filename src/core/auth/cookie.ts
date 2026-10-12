import type { UserRole } from "@/types/user";

/** Readable by Edge middleware — synced from localStorage on the client */
export const AUTH_SESSION_COOKIE = "event_surway_session";

export type AuthSessionCookie = {
  role: UserRole;
  realRole: UserRole;
  impersonating: boolean;
};

type SessionUsers = {
  realUser: { role: UserRole } | null;
  impersonatedUser: { role: UserRole } | null;
};

export function parseAuthSessionCookie(
  raw: string | undefined | null,
): AuthSessionCookie | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as AuthSessionCookie;
    if (!data?.role || !data?.realRole) return null;
    return {
      role: data.role,
      realRole: data.realRole,
      impersonating: Boolean(data.impersonating),
    };
  } catch {
    return null;
  }
}

/** Client-only: keep cookie in sync so middleware can gate /admin and /event */
export function writeAuthSessionCookie(snapshot: SessionUsers) {
  if (typeof document === "undefined") return;

  const realUser = snapshot.realUser;
  const effective = snapshot.impersonatedUser ?? realUser;

  if (!realUser || !effective) {
    document.cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }

  const payload: AuthSessionCookie = {
    role: effective.role,
    realRole: realUser.role,
    impersonating: Boolean(snapshot.impersonatedUser),
  };

  document.cookie = `${AUTH_SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; Max-Age=2592000; SameSite=Lax`;
}
