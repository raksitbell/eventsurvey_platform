// noinspection ES6PreferShortImport
import type { UserRole } from "@/types/user";
// noinspection ES6PreferShortImport
import { ADMIN_ROLES, EVENT_ROLES } from "./constants";

export function getHomePathForRole(role: UserRole): string {
  if (ADMIN_ROLES.includes(role)) return "/admin";
  if (EVENT_ROLES.includes(role)) return "/event";
  return "/login";
}

export function canAccessAdmin(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canAccessEvent(role: UserRole): boolean {
  return EVENT_ROLES.includes(role);
}

/** Super Admin enters /admin only when not impersonating */
export function canEnterAdminArea(
  realRole: UserRole | undefined,
  isImpersonating: boolean,
): boolean {
  return Boolean(realRole && canAccessAdmin(realRole) && !isImpersonating);
}

/**
 * /event is for event_owner / sub_user only.
 * Super Admin may enter only while impersonating one of those roles.
 */
export function canEnterEventArea(
  effectiveRole: UserRole | undefined,
  realRole: UserRole | undefined,
  isImpersonating: boolean,
): boolean {
  if (!effectiveRole || !canAccessEvent(effectiveRole)) return false;
  if (realRole && canAccessAdmin(realRole)) return isImpersonating;
  return true;
}

export function canImpersonate(role: UserRole): boolean {
  return role === "super_admin";
}

export function isImpersonatableRole(role: UserRole): boolean {
  return EVENT_ROLES.includes(role);
}

export function canAccessPortal(role: UserRole): boolean {
  return canAccessAdmin(role) || canAccessEvent(role);
}
