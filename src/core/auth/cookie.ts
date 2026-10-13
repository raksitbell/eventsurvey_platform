import type { UserRole } from "@/types/user";
import { PORTAL_ROLES } from "./constants";

/** Readable by Edge middleware — synced from localStorage on the client */
export const AUTH_SESSION_COOKIE = "event_surway_session";

export type AuthSessionCookie = {
  userId: string;
  role: UserRole;
  realRole: UserRole;
  impersonating: boolean;
};

type SessionUsers = {
  realUser: { id: string; role: UserRole } | null;
  impersonatedUser: { id: string; role: UserRole } | null;
};

/** Only portal roles may hold a session — anything else (participant, unknown
 *  values, tampered cookies) is treated as signed out. Without this, an
 *  unknown role reaches getHomePathForRole(), gets "/login" back, and the
 *  middleware redirects /login → /login forever. */
function toPortalRole(value: unknown): UserRole | null {
  return PORTAL_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

export function parseAuthSessionCookie(
  raw: string | undefined | null,
): AuthSessionCookie | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<AuthSessionCookie>;
    const role = toPortalRole(data?.role);
    const realRole = toPortalRole(data?.realRole);
    if (!role || !realRole) return null;
    if (typeof data?.userId !== "string" || !data.userId) return null;
    return {
      userId: data.userId,
      role,
      realRole,
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
    userId: effective.id,
    role: effective.role,
    realRole: realUser.role,
    impersonating: Boolean(snapshot.impersonatedUser),
  };

  document.cookie = `${AUTH_SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; Max-Age=2592000; SameSite=Lax`;
}
