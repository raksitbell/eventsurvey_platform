export interface ReportForm {
  id: string;
  title: string;
  type: string;
  approved: boolean;
}
export interface ResponseRow {
  id: string;
  formId: string;
  respondent: string;
  submittedAt: string;
  complete: boolean;
  score: number | null;
  answers: { fieldId: string; label: string; value: string }[];
}
export interface TrashRow {
  id: string;
  name: string;
  type: string;
  deletedBy: string;
  expiresAt: string;
  canRestore: boolean;
}
export interface DashboardWidget {
  grid_span?: number;
  date_range_days?: number;
  id: string;
  layout_id: string;
  widget_type: "number" | "comparison" | "chart";
  title: string;
  source_form_id: string | null;
  source_field_id: string | null;
  aggregation:
    "count" | "sum" | "average" | "minimum" | "maximum" | "percentage";
  chart_type: "bar" | "line" | "pie" | "donut" | null;
  comparison_mode: "previous_period" | "target" | "capacity" | null;
  target_value: number | null;
  display_order: number;
  updated_at: string;
}
export interface ReportingData {
  eventId: string;
  eventName: string;
  canManage: boolean;
  forms: ReportForm[];
  responses: ResponseRow[];
  trash: TrashRow[];
  widgets: DashboardWidget[];
  fields: { id: string; formId: string; label: string; numeric: boolean }[];
}
