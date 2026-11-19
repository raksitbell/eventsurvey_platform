import { AUTH_STORAGE_KEY, IMPERSONATE_STORAGE_KEY } from "./constants";
import type { User } from "@/types/user";

export type AuthSnapshot = {
  realUser: User | null;
  /** @deprecated Impersonation removed — always null for new sessions. */
  impersonatedUser: User | null;
  inspectedEventId: string | null;
  inspectedEventName: string | null;
  /** platform_access.overview is view_only+ */
  canViewOverview: boolean;
  /** platform_access.events is view_only+ */
  canViewEvents: boolean;
  /** platform_access.users is view_only+ */
  canViewUsers: boolean;
  /** From platform_access.canViewActivity (super_admin User Activity). */
  canViewActivity: boolean;
  /** From platform_access.canInspection — open event workspace as platform. */
  canInspection: boolean;
  /** From platform_access.events === can_edit (create / edit / status). */
  canManageEvents: boolean;
};

export function clearLegacyAuthStorage() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(IMPERSONATE_STORAGE_KEY);
  } catch {
    // Session restoration works even when browser storage is unavailable.
  }
}
