import type {
  EventPermissionMatrix,
  ModuleAccessLevel,
} from "@/types/event/permissions";
import type { MockPermissionCode } from "@/types/mock";

export const DEFAULT_ADMIN_MATRIX: EventPermissionMatrix = {
  event: "can_edit",
  registrationForm: "can_edit",
  surveyForm: "can_edit",
  dashboard: "can_edit",
  canViewSubmissions: true,
  canManageSubmissions: true,
  canExport: true,
};

export const DEFAULT_SUB_USER_MATRIX: EventPermissionMatrix = {
  event: "view_only",
  registrationForm: "view_only",
  surveyForm: "view_only",
  dashboard: "view_only",
  canViewSubmissions: false,
  canManageSubmissions: false,
  canExport: false,
};

/**
 * Serialize matrix to JSON for storage in mock role description or metadata.
 */
export function serializePermissionMatrix(
  matrix: EventPermissionMatrix,
): string {
  return JSON.stringify(matrix);
}

/**
 * Deserialize matrix from JSON or fallback to deriving it from MockPermissionCode list.
 */
export function deserializePermissionMatrix(
  jsonText: string | null | undefined,
  fallbackCodes: readonly MockPermissionCode[] = [],
): EventPermissionMatrix {
  if (fallbackCodes.includes("manage_sub_user")) {
    return { ...DEFAULT_ADMIN_MATRIX };
  }

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as Partial<EventPermissionMatrix>;
      if (
        parsed &&
        typeof parsed === "object" &&
        "event" in parsed &&
        "dashboard" in parsed
      ) {
        return {
          event: parsed.event ?? "view_only",
          registrationForm: parsed.registrationForm ?? "view_only",
          surveyForm: parsed.surveyForm ?? "view_only",
          dashboard: parsed.dashboard ?? "view_only",
          canViewSubmissions: Boolean(parsed.canViewSubmissions),
          canManageSubmissions: Boolean(parsed.canManageSubmissions),
          canExport: Boolean(parsed.canExport),
        };
      }
    } catch {
      // Ignore parse errors and fall through to fallbackCodes mapping
    }
  }

  // Derive from standard mock permission codes
  return {
    event: fallbackCodes.includes("manage_event") ? "can_edit" : "view_only",
    registrationForm: fallbackCodes.includes("manage_registration_form")
      ? "can_edit"
      : "view_only",
    surveyForm: fallbackCodes.includes("manage_survey_form")
      ? "can_edit"
      : "view_only",
    dashboard: fallbackCodes.includes("manage_dashboard")
      ? "can_edit"
      : "view_only",
    canViewSubmissions: fallbackCodes.includes("manage_dashboard"),
    canManageSubmissions: fallbackCodes.includes("manage_dashboard"),
    canExport: fallbackCodes.includes("manage_dashboard"),
  };
}

/**
 * Convert an EventPermissionMatrix to the standard MockPermissionCode array
 * for persistence in the relational `role_permissions` mock table.
 */
export function matrixToMockPermissions(
  matrix: EventPermissionMatrix,
): MockPermissionCode[] {
  const codes: MockPermissionCode[] = [];

  if (matrix.event === "can_edit") {
    codes.push("manage_event");
  }
  if (matrix.registrationForm === "can_edit") {
    codes.push("manage_registration_form");
  }
  if (matrix.surveyForm === "can_edit") {
    codes.push("manage_survey_form");
  }
  if (matrix.dashboard === "can_edit") {
    codes.push("manage_dashboard");
  }

  return codes;
}

/**
 * Helper to check whether an access level satisfies a minimum requirement.
 * can_edit > view_only > restricted
 */
export function satisfiesAccessLevel(
  actual: ModuleAccessLevel,
  required: ModuleAccessLevel,
): boolean {
  if (required === "restricted") return true;
  if (required === "view_only") {
    return actual === "view_only" || actual === "can_edit";
  }
  if (required === "can_edit") {
    return actual === "can_edit";
  }
  return false;
}
