import { ADMIN_ROLES, EVENT_ROLES } from "@/core/auth/constants";
import type { UserRole } from "@/types/user";

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

/** Super Admin enters /admin only when not impersonating (inspect keeps admin access). */
export function canEnterAdminArea(
  realRole: UserRole | undefined,
  isImpersonating: boolean,
): boolean {
  return Boolean(realRole && canAccessAdmin(realRole) && !isImpersonating);
}

/**
 * /event is for event_owner / sub_user.
 * Platform admin enters only while inspecting a specific event (no role swap).
 * Legacy impersonation still opens /event for compatibility.
 */
export function canEnterEventArea(
  effectiveRole: UserRole | undefined,
  realRole: UserRole | undefined,
  isImpersonating: boolean,
  inspectedEventId: string | null = null,
): boolean {
  if (realRole && canAccessAdmin(realRole)) {
    if (inspectedEventId && !isImpersonating) return true;
    return isImpersonating && Boolean(effectiveRole && canAccessEvent(effectiveRole));
  }
  if (!effectiveRole || !canAccessEvent(effectiveRole)) return false;
  return true;
}

/** Platform admins may open an event workspace for inspection. */
export function canInspectEvent(role: UserRole): boolean {
  return role === "super_admin";
}

export function isImpersonatableRole(role: UserRole): boolean {
  return EVENT_ROLES.includes(role);
}

export function canAccessPortal(role: UserRole): boolean {
  return canAccessAdmin(role) || canAccessEvent(role);
}
