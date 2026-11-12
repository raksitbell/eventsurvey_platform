import type { MockPermissionCode } from "@/types/mock";

/**
 * Access level for the 4 core event modules according to SRS v2.1.0:
 * - restricted: No access (hidden / blocked)
 * - view_only: Can view data, but cannot edit or change settings
 * - can_edit: Full read and edit permissions within the module
 */
export type ModuleAccessLevel = "restricted" | "view_only" | "can_edit";

/**
 * Event-scoped permission matrix for Event Sub-Users.
 * Event Admin always has full 'can_edit' and both toggles enabled.
 */
export interface EventPermissionMatrix {
  event: ModuleAccessLevel;
  registrationForm: ModuleAccessLevel;
  surveyForm: ModuleAccessLevel;
  dashboard: ModuleAccessLevel;
  /** Toggle: allow viewing participant submissions list and answers */
  canViewSubmissions: boolean;
  /** Toggle: allow exporting raw CSV / XLSX / PDF reports */
  canExport: boolean;
}

export type SubUserStatus = "invited" | "active" | "suspended" | "removed";

export interface EventSubUserItem {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  customRoleName: string | null;
  status: SubUserStatus;
  joinedAt: string | null;
  createdAt: string;
  permissions: EventPermissionMatrix;
  rawPermissions: MockPermissionCode[];
}

export interface SubUsersListResponse {
  subUsers: EventSubUserItem[];
  canManageSubUsers: boolean;
}

export interface UpdateSubUserPermissionsInput {
  roleName?: string;
  permissions: EventPermissionMatrix;
}

export interface InviteSubUserInput {
  email: string;
  name: string;
  roleName: string;
  permissions: EventPermissionMatrix;
}
