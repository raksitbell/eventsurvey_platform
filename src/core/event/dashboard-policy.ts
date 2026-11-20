import { satisfiesAccessLevel } from "@/core/auth/event-permissions";
import type { ModuleAccessLevel } from "@/types/event/permissions";
import type { MockEventStatus, MockPermissionCode } from "@/types/mock";

export function isPublishedDashboardEvent(status: MockEventStatus): boolean {
  return status === "scheduled" || status === "open" || status === "closed";
}

/** Dashboard reads use the saved module level (`view_only` or `can_edit`). */
export function canAccessEventDashboard(
  status: MockEventStatus,
  dashboardAccess: ModuleAccessLevel,
  required: ModuleAccessLevel = "view_only",
): boolean {
  return (
    isPublishedDashboardEvent(status) &&
    satisfiesAccessLevel(dashboardAccess, required)
  );
}

/**
 * Legacy code-only roles: `manage_dashboard` means edit; absence means no
 * dashboard access when a matrix is not available.
 */
export function canUseEventDashboard(
  status: MockEventStatus,
  permissions: readonly MockPermissionCode[],
): boolean {
  return canAccessEventDashboard(
    status,
    permissions.includes("manage_dashboard") ? "can_edit" : "restricted",
  );
}

export function isReportingChoiceField(type: string): boolean {
  return ["single_choice", "multiple_choice", "checkbox", "dropdown"].includes(
    type,
  );
}

export function isReportingFieldPrivate(field: {
  type: string;
  is_unique?: boolean;
  contains_pii?: boolean;
}): boolean {
  if (
    field.type === "email" ||
    field.is_unique ||
    field.contains_pii === true
  ) {
    return true;
  }
  if (field.contains_pii === false) return false;

  // Current mock fields have no PII classification. Only structured choices and
  // ratings can safely supply values in this case.
  return !isReportingChoiceField(field.type) && field.type !== "rating";
}
