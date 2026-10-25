export interface Field {
  id: string;
  form_id: string;
  type: string;
  display_order: number;
  contains_pii: boolean;
  deleted_at: string | null;
}
export interface Answer {
  id: string;
  submission_id: string;
  field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_time: string | null;
}
export interface Dashboard {
  id: string;
  event_id: string;
  title_th: string;
  title_en: string;
  layout_json: { columns: number; gap: number };
  display_order: number;
  is_visible: boolean;
}
export interface Widget {
  id: string;
  dashboard_data_id: string;
  type: string;
  title_th: string;
  title_en: string;
  form_id: string | null;
  field_id: string | null;
  config_json: {
    span?: number;
    metric?: string;
    source?: string;
    chart?: string;
    mask_pii?: boolean;
  };
  display_order: number;
}
export interface Filters {
  eventId: string;
  formId: string;
  from: string;
  to: string;
  locale: "th" | "en";
  raw: boolean;
}
export interface ResponseRow {
  id: string;
  formId: string;
  submittedAt: string;
  values: Record<string, string>;
}
export interface AnalyticsData {
  event: { id: string; title: string; timezone: string };
  filters: Filters;
  forms: { id: string; title: string; type: string }[];
  fields: {
    id: string;
    formId: string;
    label: string;
    pii: boolean;
    type: string;
  }[];
  rows: ResponseRow[];
  metrics: { registrations: number; surveys: number; total: number };
  trend: { day: string; count: number }[];
  dashboards: Dashboard[];
  widgets: (Widget & {
    value: number | null;
    distribution: { label: string; count: number }[];
  })[];
  permissions: { raw: boolean; manage: boolean };
}
