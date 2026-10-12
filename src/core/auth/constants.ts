import type { UserRole } from "@/types/user";

export const AUTH_STORAGE_KEY = "event_surway_auth";
export const IMPERSONATE_STORAGE_KEY = "event_surway_impersonate";

export const ADMIN_ROLES: UserRole[] = ["super_admin"];
export const EVENT_ROLES: UserRole[] = ["event_owner", "sub_user"];
export const PORTAL_ROLES: UserRole[] = [
  "super_admin",
  "event_owner",
  "sub_user",
];
