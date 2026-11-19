import { mockApi } from "@/core/api/mock-client";
import {
  DEFAULT_ADMIN_MATRIX,
  DEFAULT_SUB_USER_MATRIX,
  deserializePermissionMatrix,
  serializePermissionMatrix,
} from "@/core/auth/event-permissions";
import {
  DEFAULT_PLATFORM_MATRIX,
  FULL_PLATFORM_MATRIX,
  type PlatformAccessMatrix,
} from "@/types/admin/users";
import type {
  EventPermissionMatrix,
  ModuleAccessLevel,
} from "@/types/event/permissions";
import type {
  MockEventAccess,
  MockPermissionCode,
  MockPlatformAccess,
  MockPlatformPermissionCode,
} from "@/types/mock";

export type { PlatformAccessMatrix };
export { DEFAULT_PLATFORM_MATRIX, FULL_PLATFORM_MATRIX };

function normalizeEventMatrix(
  value: unknown,
  canManageSubUsers = false,
): EventPermissionMatrix {
  if (canManageSubUsers) {
    return { ...DEFAULT_ADMIN_MATRIX };
  }
  return deserializePermissionMatrix(
    value ?? serializePermissionMatrix(DEFAULT_SUB_USER_MATRIX),
  );
}

export function normalizePlatformMatrix(value: unknown): PlatformAccessMatrix {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_PLATFORM_MATRIX };
  }
  const raw = value as Partial<PlatformAccessMatrix> & {
    /** Legacy module level before canViewActivity boolean. */
    activity?: ModuleAccessLevel;
  };
  const read = (
    key: "overview" | "events" | "users",
  ): ModuleAccessLevel => {
    const v = raw[key];
    if (v === "can_edit" || v === "restricted" || v === "view_only") return v;
    return "restricted";
  };
  const legacyActivity =
    raw.activity === "view_only" || raw.activity === "can_edit";
  const overview = read("overview");
  return {
    // Overview is read-only — never grant can_edit.
    overview: overview === "can_edit" ? "view_only" : overview,
    events: read("events"),
    users: read("users"),
    canViewActivity: raw.canViewActivity === true || legacyActivity,
    canInspection: raw.canInspection === true,
    canViewUnmaskedPii: raw.canViewUnmaskedPii === true,
  };
}

/** Load the event_access row for a user (optional event filter). */
export async function getEventAccessRow(
  userId: string,
  eventId?: string | null,
): Promise<MockEventAccess | null> {
  if (!userId) return null;
  const rows = await mockApi.get<MockEventAccess[]>(
    `/event_access?user_id=${encodeURIComponent(userId)}`,
  );
  const match = rows.find(
    (row) =>
      row.user_id === userId &&
      (!eventId || row.event_id === eventId) &&
      !row.deleted_at,
  );
  return match ?? null;
}

export async function getEventAccessForUser(
  userId: string,
  eventId?: string | null,
): Promise<{
  row: MockEventAccess | null;
  matrix: EventPermissionMatrix;
  canManageSubUsers: boolean;
  roleName: string | null;
}> {
  const row = await getEventAccessRow(userId, eventId);
  if (!row) {
    return {
      row: null,
      matrix: { ...DEFAULT_SUB_USER_MATRIX },
      canManageSubUsers: false,
      roleName: null,
    };
  }
  return {
    row,
    matrix: normalizeEventMatrix(row.matrix, row.can_manage_sub_users),
    canManageSubUsers: Boolean(row.can_manage_sub_users),
    roleName: row.role_name,
  };
}

/** Legacy manage_* codes derived from event_access (for older call sites). */
export function eventMatrixToLegacyCodes(
  matrix: EventPermissionMatrix,
  canManageSubUsers = false,
): MockPermissionCode[] {
  const codes: MockPermissionCode[] = [];
  if (canManageSubUsers) codes.push("manage_sub_user");
  if (matrix.event === "can_edit") codes.push("manage_event");
  if (matrix.registrationForm === "can_edit") {
    codes.push("manage_registration_form");
  }
  if (matrix.surveyForm === "can_edit") codes.push("manage_survey_form");
  if (matrix.dashboard === "can_edit") codes.push("manage_dashboard");
  return codes;
}

export async function getRolePermissionsFromAccess(
  userId: string | null | undefined,
  eventId?: string | null,
): Promise<MockPermissionCode[]> {
  if (!userId) return [];
  const access = await getEventAccessForUser(userId, eventId);
  return eventMatrixToLegacyCodes(access.matrix, access.canManageSubUsers);
}

export async function getPlatformAccessRow(
  userId: string,
): Promise<MockPlatformAccess | null> {
  if (!userId) return null;
  const rows = await mockApi.get<MockPlatformAccess[]>(
    `/platform_access?user_id=${encodeURIComponent(userId)}`,
  );
  return (
    rows.find((row) => row.user_id === userId && !row.deleted_at) ?? null
  );
}

export async function getPlatformAccessForUser(
  userId: string,
): Promise<PlatformAccessMatrix> {
  const row = await getPlatformAccessRow(userId);
  return normalizePlatformMatrix(row?.matrix);
}

/** Session / nav flags derived from a platform matrix. */
export function platformSessionFlags(matrix: PlatformAccessMatrix) {
  return {
    canViewOverview: satisfiesModuleAccess(matrix.overview, "view_only"),
    canViewEvents: satisfiesModuleAccess(matrix.events, "view_only"),
    canViewUsers: satisfiesModuleAccess(matrix.users, "view_only"),
    canViewActivity: matrix.canViewActivity === true,
    canManageEvents: satisfiesModuleAccess(matrix.events, "can_edit"),
  };
}

export async function hasPlatformPermission(
  userId: string | null | undefined,
  permission: MockPlatformPermissionCode,
): Promise<boolean> {
  if (!userId) return false;
  const matrix = await getPlatformAccessForUser(userId);
  switch (permission) {
    case "view_platform_overview":
      return (
        matrix.overview === "view_only" || matrix.overview === "can_edit"
      );
    case "view_all_events":
      return matrix.events === "view_only" || matrix.events === "can_edit";
    case "manage_all_events":
      return matrix.events === "can_edit";
    case "view_platform_users":
      return matrix.users === "view_only" || matrix.users === "can_edit";
    case "manage_platform_users":
      return matrix.users === "can_edit";
    case "view_platform_activity":
      return matrix.canViewActivity;
    case "inspect_event":
      return matrix.canInspection;
    case "view_unmasked_pii":
      return matrix.canViewUnmaskedPii;
    default:
      return false;
  }
}

export function satisfiesModuleAccess(
  actual: ModuleAccessLevel,
  required: ModuleAccessLevel,
): boolean {
  if (required === "restricted") return true;
  if (required === "view_only") {
    return actual === "view_only" || actual === "can_edit";
  }
  return actual === "can_edit";
}
