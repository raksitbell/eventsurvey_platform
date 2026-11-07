/**
 * Raw shapes from the mock JSON Server (`event_mock_api/db.json`).
 * Soft-delete uses `deleted_at` / `removed_at` where present.
 * Event titles live in `event_translations`, not on `events`.
 * Permissions live in `role_permissions` / `platform_role_permissions`.
 */

export type MockSystemRole = "platform_admin" | "event_user";
export type MockAccountStatus = "invited" | "active" | "suspended" | "removed";
export type MockEventStatus = "draft" | "scheduled" | "open" | "closed";
export type MockSurveyAccess = "public" | "registered_only";
export type MockFormType = "registration" | "survey";
export type MockFormStatus = "draft" | "scheduled" | "open" | "closed";
export type MockFieldType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "dropdown"
  | "date"
  | "time"
  | "number"
  | "email"
  | "rating";
export type MockRatingDisplay = "icon" | "linear_scale";
export type MockRatingIcon = "star" | "heart" | "like";
export type MockSubmissionStatus = "submitted" | "cancelled";
export type MockWhitelistEntryStatus = "available" | "joined";
export type MockPermissionCode =
  | "manage_dashboard"
  | "manage_event"
  | "manage_registration_form"
  | "manage_survey_form"
  | "manage_sub_user";
export type MockPlatformPermissionCode =
  | "manage_platform_users"
  | "manage_all_events"
  | "view_platform_overview"
  | "impersonate_event_user";

export interface MockUser {
  id: string;
  email: string;
  /** Mock login only — never return to the browser */
  password: string;
  display_name: string;
  system_role: MockSystemRole;
  /** Platform Admin only */
  platform_role_id: string | null;
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

export interface MockPlatformRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface MockPlatformRolePermission {
  id?: string;
  platform_role_id: string;
  permission: MockPlatformPermissionCode;
}

/** Custom role owned by an Event (`/roles`) */
export interface MockRole {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

/** One row = role grants that permission (`/role_permissions`) */
export interface MockRolePermission {
  /** Present for json-server compatibility; not in production PK */
  id?: string;
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
  updated_by: string;
}

export interface MockEventTranslation {
  id: string;
  event_id: string;
  locale_code: string;
  display_order: number;
  title: string;
  description: string | null;
  location_name: string | null;
  address_text: string | null;
  created_at: string;
  updated_at: string;
  /** Legacy seed field — ignore if present */
  summary?: string | null;
}

export interface MockEventFormSettings {
  id: string;
  event_id: string;
  form_type: MockFormType;
  is_unlimited: boolean;
  capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface MockEventBanner {
  id: string;
  event_id: string;
  banner_url: string;
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
  scale_min_label?: string | null;
  scale_max_label?: string | null;
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

export interface MockWhitelistEntry {
  id: string;
  event_id: string;
  access_code: string;
  username: string;
  status: MockWhitelistEntryStatus;
  joined_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface MockFormSubmission {
  id: string;
  form_id: string;
  status: MockSubmissionStatus;
  submitted_at: string;
  cancelled_by_user_id: string | null;
  cancelled_at: string | null;
}

export interface MockRegistration {
  submission_id: string;
  whitelist_entry_id: string | null;
  confirmation_code: string;
}

export interface MockSubmissionAnswer {
  id: string;
  submission_id: string;
  field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_time: string | null;
  created_at: string;
}

export interface MockAnswerOptionSelection {
  answer_id: string;
  option_id: string;
}

export type MockDashboardWidgetType = "number" | "comparison" | "chart";
export type MockDisplaySize = "small" | "medium" | "large" | "custom";

export interface MockDashboardLayout {
  id: string;
  event_id: string;
  updated_by_user_id: string;
  updated_at: string;
}

export interface MockDashboardWidget {
  id: string;
  layout_id: string;
  widget_type: MockDashboardWidgetType;
  title: string;
  source_form_id: string | null;
  source_field_id: string | null;
  aggregation: string;
  chart_type: string | null;
  comparison_mode: string | null;
  target_value: number | null;
  text_align: string;
  date_type: string | null;
  start_date: string | null;
  end_date: string | null;
  display_size: MockDisplaySize;
  grid_w: number | null;
  grid_h: number | null;
  display_order: number;
  updated_at: string;
}
