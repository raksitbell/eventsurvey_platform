import type {
  EventPermissionMatrix,
  ModuleAccessLevel,
} from "@/types/event/permissions";
import type { FormType } from "@/types/event/form";
import type { MockPermissionCode } from "@/types/mock";

export type FormPermissionModule = "registrationForm" | "surveyForm";

export function formPermissionModule(type: FormType): FormPermissionModule {
  return type === "registration" ? "registrationForm" : "surveyForm";
}

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

function parseMatrixPayload(
  value: unknown,
): Partial<Record<keyof EventPermissionMatrix, unknown>> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Partial<Record<keyof EventPermissionMatrix, unknown>>;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Partial<Record<keyof EventPermissionMatrix, unknown>>;
    }
  } catch {
    return null;
  }
  return null;
}

function matrixFromParsed(
  parsed: Partial<Record<keyof EventPermissionMatrix, unknown>>,
): EventPermissionMatrix | null {
  if (!("event" in parsed) || !("dashboard" in parsed)) return null;
  return {
    event: readAccessLevel(parsed.event),
    registrationForm: readAccessLevel(parsed.registrationForm),
    surveyForm: readAccessLevel(parsed.surveyForm),
    dashboard: readAccessLevel(parsed.dashboard),
    canViewSubmissions: parsed.canViewSubmissions === true,
    canManageSubmissions:
      parsed.canViewSubmissions === true &&
      parsed.canManageSubmissions === true,
    canExport: parsed.canExport === true,
  };
}

/**
 * Deserialize matrix from JSON (string or already-parsed object) or fall back
 * to deriving it from MockPermissionCode list.
 */
export function deserializePermissionMatrix(
  jsonText: unknown,
  fallbackCodes: readonly MockPermissionCode[] = [],
): EventPermissionMatrix {
  if (fallbackCodes.includes("manage_sub_user")) {
    return { ...DEFAULT_ADMIN_MATRIX };
  }

  const parsed = parseMatrixPayload(jsonText);
  if (parsed) {
    const matrix = matrixFromParsed(parsed);
    if (matrix) return matrix;
  }

  // Legacy code-only roles: manage_* means can_edit. Absence means restricted.
  // Explicit view_only access is stored in the saved matrix JSON, not inferred.
  return {
    event: fallbackCodes.includes("manage_event") ? "can_edit" : "restricted",
    registrationForm: fallbackCodes.includes("manage_registration_form")
      ? "can_edit"
      : "restricted",
    surveyForm: fallbackCodes.includes("manage_survey_form")
      ? "can_edit"
      : "restricted",
    dashboard: fallbackCodes.includes("manage_dashboard")
      ? "can_edit"
      : "restricted",
    canViewSubmissions: fallbackCodes.includes("manage_dashboard"),
    canManageSubmissions: fallbackCodes.includes("manage_dashboard"),
    canExport: fallbackCodes.includes("manage_dashboard"),
  };
}

/**
 * Prefer the user-embedded matrix, then role.description, then legacy codes.
 */
export function resolvePermissionMatrix(
  userMatrix: unknown,
  roleDescription: unknown,
  fallbackCodes: readonly MockPermissionCode[] = [],
): EventPermissionMatrix {
  const fromUser = parseMatrixPayload(userMatrix);
  if (fromUser) {
    const matrix = matrixFromParsed(fromUser);
    if (matrix) return matrix;
  }
  return deserializePermissionMatrix(roleDescription, fallbackCodes);
}

function readAccessLevel(value: unknown): ModuleAccessLevel {
  if (value === "can_edit" || value === "restricted") return value;
  return "view_only";
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
