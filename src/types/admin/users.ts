import type { ModuleAccessLevel } from "@/types/event/permissions";
import type { User, UserRole, UserStatus } from "@/types/user";

/** Platform admin module matrix (`platform_access.matrix`). */
export type PlatformAccessMatrix = {
  overview: ModuleAccessLevel;
  events: ModuleAccessLevel;
  users: ModuleAccessLevel;
  canViewActivity: boolean;
  canInspection: boolean;
  canViewUnmaskedPii: boolean;
};

export const DEFAULT_PLATFORM_MATRIX: PlatformAccessMatrix = {
  overview: "restricted",
  events: "restricted",
  users: "restricted",
  canViewActivity: false,
  canInspection: false,
  canViewUnmaskedPii: false,
};

export const FULL_PLATFORM_MATRIX: PlatformAccessMatrix = {
  overview: "view_only",
  events: "can_edit",
  users: "can_edit",
  canViewActivity: true,
  canInspection: true,
  canViewUnmaskedPii: true,
};

/** @deprecated Prefer PlatformAccessMatrix — kept for older call sites. */
export type PlatformAccessFlags = PlatformAccessMatrix;

/** Bound row for /admin/users — assembled from users + events + event_translations + roles */
export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  ownerId: string | null;
  ownerName: string | null;
  canViewSensitiveData: boolean;
  /** Assigned event id when the account belongs to an event */
  eventId: string | null;
  /** Single event name (1 owner / sub_user ↔ 1 event) */
  eventName: string | null;
  /** Custom role within that event (sub_user only) */
  customRoleName: string | null;
  lastActiveAt?: string | null;
  /** Full platform matrix for super_admin rows. */
  platformAccess?: PlatformAccessMatrix;
  /** Convenience mirrors of platformAccess toggles (super_admin). */
  canViewActivity?: boolean;
  canInspection?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  events?: Array<{ id: string; title: string }>;
  meta: {
    total: number;
    byRole: Record<string, number>;
  };
}

/** Safe user payload for impersonation (no password) */
export type ImpersonationUser = Omit<User, "password">;

export type AdminUserWriteInput = {
  name: string;
  email: string;
  role: UserRole;
  isTrial?: boolean;
  /** Required for Event Editor; ignored for Platform Admin. */
  eventId?: string | null;
  /** Plain password set by admin (never returned to the browser later). */
  password?: string;
  /** Provision the public demo preset for a trial in a designated demo environment. */
  usePublishedPassword?: boolean;
};

export type AdminUserWriteResult = {
  id: string;
  inviteSent: boolean;
  passwordSet: boolean;
};
