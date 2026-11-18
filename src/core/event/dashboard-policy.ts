import type { MockEventStatus, MockPermissionCode } from "@/types/mock";

export function isPublishedDashboardEvent(status: MockEventStatus): boolean {
  return status === "scheduled" || status === "open" || status === "closed";
}

export function canUseEventDashboard(
  status: MockEventStatus,
  permissions: readonly MockPermissionCode[],
): boolean {
  return (
    isPublishedDashboardEvent(status) &&
    permissions.includes("manage_dashboard")
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
