/**
 * Raw shapes from the mock JSON Server (`event_mock_api/db.json`).
 * Soft-delete uses `deleted_at` / `removed_at` (not `isDeleted`).
 * Event titles live in `event_translations`, not on `events`.
 */

export type MockSystemRole = "platform_admin" | "event_user";
export type MockEventRole = "event_admin" | "event_sub_user";
export type MockAccountStatus = "invited" | "active" | "suspended" | "removed";
export type MockEventStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "closed"
  | "archived";
export type MockFormType = "registration" | "survey";
export type MockFormStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published"
  | "paused"
  | "closed"
  | "archived";
export type MockSubmissionStatus = "submitted" | "soft_deleted";

export interface MockUser {
  id: string;
  email: string;
  /** Mock login only — never return to the browser */
  password: string;
  display_name: string;
  system_role: MockSystemRole;
  event_id: string | null;
  /** Legacy API fields; current role_permissions are normalized by services/auth/access. */
  event_role?: MockEventRole | null;
  /** Optional custom role (mainly for event_sub_user fine-grained permissions) */
  role_id: string | null;
  can_manage_dashboard?: boolean;
  can_manage_event?: boolean;
  can_manage_registration_form?: boolean;
  can_manage_survey_form?: boolean;
  can_manage_sub_user?: boolean;
  can_approve?: boolean;
  can_view_unmasked_pii?: boolean;
  permission_granted_by_user_id: string | null;
  permission_updated_at: string | null;
  status: MockAccountStatus;
  invited_by_user_id: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  removed_at: string | null;
}

/** Custom role owned by an Event Admin (`/roles`) */
export interface MockRole {
  id: string;
  event_id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockPermission {
  id: string;
  role_id: string;
  feature: string;
  can_access: boolean;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve?: boolean;
  can_publish: boolean;
}

export interface MockEvent {
  id: string;
  slug: string;
  status: MockEventStatus;
  default_locale: string;
  language_rotation_seconds: number;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  banner_url: string | null;
  banner_aspect_ratio: string | null;
  created_by_user_id: string;
  published_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MockEventTranslation {
  id: string;
  event_id: string;
  locale_code: string;
  title: string;
  summary: string | null;
  description: string | null;
  venue_name: string | null;
  address_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockForm {
  id: string;
  event_id: string;
  type: MockFormType;
  status: MockFormStatus;
  opens_at: string | null;
  closes_at: string | null;
  accepting_responses: boolean;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MockFormSubmission {
  id: string;
  form_id: string;
  status: MockSubmissionStatus;
  submitted_language: string;
  submitted_at: string;
  deleted_by_user_id: string | null;
  deleted_at: string | null;
}

// -----------------------------------------------------------------------
// Form field types
// -----------------------------------------------------------------------

export type MockFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "rating"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "date"
  | "time";

export interface MockFormField {
  id: string;
  form_id: string;
  type: MockFieldType;
  display_order: number;
  is_required: boolean;
  contains_pii: boolean;
  min_number: number | null;
  max_number: number | null;
  min_length: number | null;
  max_length: number | null;
  validation_pattern: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MockFieldTranslation {
  id: string;
  field_id: string;
  locale_code: string;
  label: string;
  placeholder: string | null;
}

export interface MockFieldOption {
  id: string;
  field_id: string;
  display_order: number;
  created_at: string;
  deleted_at: string | null;
}

export interface MockFieldOptionTranslation {
  id: string;
  option_id: string;
  locale_code: string;
  label: string;
}

export interface MockFormTranslation {
  id: string;
  form_id: string;
  locale_code: string;
  title: string;
  description: string | null;
}

// -----------------------------------------------------------------------
// Role permissions
// -----------------------------------------------------------------------

export type MockPermissionCode =
  | "manage_dashboard"
  | "manage_event"
  | "manage_registration_form"
  | "manage_survey_form"
  | "manage_sub_user"
  | "approve"
  | "view_unmasked_pii";

export interface MockRolePermission {
  id: string;
  role_id: string;
  permission: MockPermissionCode;
  granted_by_user_id: string | null;
  granted_at: string;
}

// -----------------------------------------------------------------------
// Audit & approvals
// -----------------------------------------------------------------------

export interface MockAuditLog {
  id: string;
  action: string;
  description: string | null;
  resource_type: string;
  resource_id: string | null;
  performed_by_user_id: string | null;
  occurred_at: string;
  includes_unmasked_pii: boolean;
}

export interface MockApprovalRequest {
  id: string;
  target_type: string;
  target_id: string;
  status: "pending" | "approved" | "rejected";
  requested_by_user_id: string;
  requested_at: string;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
}
