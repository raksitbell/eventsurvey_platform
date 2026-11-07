/**
 * Raw shapes from the mock JSON Server (`event_mock_api/db.json`).
 * Soft-delete uses `deleted_at` / `removed_at` (not `isDeleted`).
 * Event titles live in `event_translations`, not on `events`.
 * Permissions live in `role_permissions` (not denormalized on `users`).
 */

export type MockSystemRole = "platform_admin" | "event_user";
export type MockAccountStatus = "invited" | "active" | "suspended" | "removed";
export type MockEventStatus = "draft" | "scheduled" | "open" | "closed";
export type MockFormType = "registration" | "survey";
export type MockFormStatus = "draft" | "scheduled" | "open" | "closed";
export type MockSurveyAccess = "public" | "registered_only";
export type MockFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "date"
  | "time"
  | "number"
  | "rating";
export type MockRatingDisplay = "icon" | "linear_scale";
export type MockRatingIcon = "star" | "heart" | "like";
export type MockSubmissionStatus = "submitted" | "soft_deleted";
export type MockPermissionCode =
  | "manage_dashboard"
  | "manage_event"
  | "manage_registration_form"
  | "manage_survey_form"
  | "manage_sub_user"
  | "approve"
  | "view_unmasked_pii";

export interface MockUser {
  id: string;
  email: string;
  /** Mock login only — never return to the browser */
  password: string;
  display_name: string;
  system_role: MockSystemRole;
  event_id: string | null;
  /** Event-scoped custom role — permissions via `role_permissions` */
  role_id: string | null;
  role_assigned_by_user_id: string | null;
  role_assigned_at: string | null;
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
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

/** One row = role grants that permission (`/role_permissions`) */
export interface MockRolePermission {
  role_id: string;
  permission: MockPermissionCode;
}

export interface MockEvent {
  id: string;
  slug: string;
  status: MockEventStatus;
  default_locale: string;
  start_at: string | null;
  end_at: string | null;
  is_private: boolean;
  has_registration: boolean;
  has_survey: boolean;
  survey_access: MockSurveyAccess | null;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface MockEventTranslation {
  id: string;
  event_id: string;
  locale_code: string;
  display_order: number;
  title: string;
  summary: string | null;
  description: string | null;
  location_name: string | null;
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
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export interface MockFormTranslation {
  id: string;
  form_id: string;
  locale_code: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockFormField {
  id: string;
  form_id: string;
  type: MockFieldType;
  display_order: number;
  is_required: boolean;
  is_unique: boolean;
  min_number: number | null;
  max_number: number | null;
  min_length: number | null;
  max_length: number | null;
  validation_pattern: string | null;
  rating_display: MockRatingDisplay | null;
  rating_icon: MockRatingIcon | null;
  rating_max: number | null;
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

export interface MockFormSubmission {
  id: string;
  form_id: string;
  status: MockSubmissionStatus;
  submitted_language: string;
  submitted_at: string;
  deleted_by_user_id: string | null;
  deleted_at: string | null;
}

export type MockApprovalTargetType =
  | "event"
  | "registration_form"
  | "survey_form";
export type MockApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";
export type MockDeletionRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed";

export interface MockApprovalRequest {
  id: string;
  event_id: string;
  target_type: MockApprovalTargetType;
  target_id: string;
  requested_by_user_id: string;
  reviewed_by_user_id: string | null;
  status: MockApprovalStatus;
  reviewer_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
}

export interface MockHardDeleteRequest {
  id: string;
  event_id: string;
  resource_type: string;
  resource_id: string;
  reason: string;
  requested_by_user_id: string;
  reviewed_by_user_id: string | null;
  status: MockDeletionRequestStatus;
  requested_at: string;
  reviewed_at: string | null;
  completed_at: string | null;
}

export interface MockAuditLog {
  id: string;
  event_id: string | null;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  description: string | null;
  includes_unmasked_pii: boolean;
  occurred_at: string;
}
