/**
 * Raw shapes from the mock JSON Server (`event_mock_api/db.json`).
 * Soft-delete uses `deleted_at` / `removed_at` where present.
 * Event titles live in `event_translations`, not on `events`.
 * Permissions live in `event_access` / `platform_access` matrices.
 */

export type MockSystemRole = "platform_admin" | "event_user";
export type MockAccountStatus = "invited" | "active" | "suspended" | "removed";
export type MockEventStatus = "draft" | "scheduled" | "open" | "closed";
export type MockSurveyAccess = "public" | "registered_only";
export type MockFormType = "registration" | "survey";
export type MockFormStatus =
  | "draft"
  | "scheduled"
  | "open"
  | "closed"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published"
  | "paused"
  | "archived";
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
  | "manage_sub_user"
  | "view_unmasked_pii";
export type MockPlatformPermissionCode =
  | "manage_platform_users"
  | "view_platform_users"
  | "manage_all_events"
  | "view_all_events"
  | "view_platform_overview"
  | "view_platform_activity"
  | "inspect_event"
  | "view_unmasked_pii";

export interface MockUser {
  id: string;
  email: string;
  /** Mock login only — never return to the browser */
  password: string;
  display_name: string;
  system_role: MockSystemRole;
  /** @deprecated Prefer `platform_access` rows keyed by user_id */
  platform_role_id: string | null;
  event_id: string | null;
  /** @deprecated Prefer `event_access` rows keyed by user_id */
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

/** Per-user platform module matrix (`/platform_access`) */
export interface MockPlatformAccess {
  id: string;
  user_id: string;
  matrix: {
    overview: "restricted" | "view_only" | "can_edit";
    events: "restricted" | "view_only" | "can_edit";
    users: "restricted" | "view_only" | "can_edit";
    /** View-only User Activity (no edit level). */
    canViewActivity: boolean;
    canInspection: boolean;
    canViewUnmaskedPii: boolean;
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

/** Per-user event module matrix (`/event_access`) */
export interface MockEventAccess {
  id: string;
  user_id: string;
  event_id: string;
  role_name: string | null;
  can_manage_sub_users: boolean;
  matrix: {
    event: "restricted" | "view_only" | "can_edit";
    registrationForm: "restricted" | "view_only" | "can_edit";
    surveyForm: "restricted" | "view_only" | "can_edit";
    dashboard: "restricted" | "view_only" | "can_edit";
    canViewSubmissions: boolean;
    canManageSubmissions?: boolean;
    canExport: boolean;
    canViewActivity?: boolean;
  };
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MockEvent {
  id: string;
  setup?: unknown;
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
  deleted_at?: string | null;
}

export interface MockEventTranslation {
  id: string;
  event_id: string;
  locale_code: string;
  display_order: number;
  title: string;
  description: string | null;
  location_name: string | null;
  floor_zone?: string | null;
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
  is_unique?: boolean;
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

/** Platform + event mutation audit trail (`/audit_logs`) */
export interface MockAuditLog {
  id: string;
  event_id: string | null;
  actor_user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  /** Stable i18n key, e.g. event_setup | user_management */
  module?: string | null;
  description_th?: string | null;
  description_en?: string | null;
  /** @deprecated Prefer description_th / description_en */
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  includes_unmasked_pii: boolean;
  occurred_at: string;
}
