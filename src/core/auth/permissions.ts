import type { UserRole } from "@/types/user";
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

export function canImpersonate(role: UserRole): boolean {
  return role === "super_admin";
}

export function isImpersonatableRole(role: UserRole): boolean {
  return EVENT_ROLES.includes(role);
}

export function canAccessPortal(role: UserRole): boolean {
  return canAccessAdmin(role) || canAccessEvent(role);
}
