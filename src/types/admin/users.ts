import type { User, UserRole, UserStatus } from "@/types/user";

/** Bound row for /admin/users — assembled from users + events + event_users + roles */
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
  /** Single event name (1 owner / sub_user ↔ 1 event) */
  eventName: string | null;
  /** Custom role within that event (sub_user only) */
  customRoleName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  meta: {
    total: number;
    byRole: Record<string, number>;
  };
}

/** Safe user payload for impersonation (no password) */
export type ImpersonationUser = Omit<User, "password">;
