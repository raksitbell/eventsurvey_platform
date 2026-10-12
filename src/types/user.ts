export type UserRole =
  | "super_admin"
  | "event_owner"
  | "sub_user"
  | "participant";

export type UserStatus = "active" | "inactive";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  ownerId: string | null;
  canViewSensitiveData: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  anonymizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
