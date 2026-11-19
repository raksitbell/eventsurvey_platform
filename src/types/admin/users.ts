import type { User, UserRole, UserStatus } from "@/types/user";

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
  /** Platform-only flags from `platform_access` (super_admin). */
  canViewActivity?: boolean;
  canInspection?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PlatformAccessFlags = {
  canViewActivity: boolean;
  canInspection: boolean;
};

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  meta: {
    total: number;
    byRole: Record<string, number>;
  };
}

/** Safe user payload for impersonation (no password) */
export type ImpersonationUser = Omit<User, "password">;
