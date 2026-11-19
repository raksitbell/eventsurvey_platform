import { saveLayoutWidgets } from "@/services/event/dashboard-layout";
import { getReportingData, ReportingError } from "@/services/event/reporting";
import type { DashboardWidget } from "@/types/event/reporting";
import type { Locale } from "@/i18n/routing";

export async function publishDashboard(
  userId: string,
  locale: Locale,
  input: unknown,
  options?: { inspectedEventId?: string | null },
) {
  const data = await getReportingData(userId, locale, undefined, options);
  if (!data.canManage) throw new ReportingError(403, "Forbidden");
  if (!Array.isArray(input) || input.length > 24)
    throw new ReportingError(400, "Invalid widgets");
  const ids = new Set<string>();
  const isValidDate = (value: unknown) =>
    value === undefined ||
    value === null ||
    (typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value);
  const widgets: Omit<DashboardWidget, "id" | "layout_id" | "updated_at">[] =
    input.map((w, i) => {
      if (
        !w ||
        typeof w !== "object" ||
        typeof w.id !== "string" ||
        !/^[a-zA-Z0-9-]{1,80}$/.test(w.id) ||
        ids.has(w.id) ||
        typeof w.title !== "string" ||
        w.title.length > 240 ||
        !["number", "chart", "comparison"].includes(w.widget_type) ||
        ![
          "count",
          "sum",
          "average",
          "minimum",
          "maximum",
          "percentage",
        ].includes(w.aggregation)
      )
        throw new ReportingError(400, "Invalid widget");
      ids.add(w.id);
      if (
        (w.grid_span !== undefined &&
          ![1, 2, 3, 4, 6, 8, 10, 12].includes(w.grid_span)) ||
        (w.row_span !== undefined && ![1, 2, 3].includes(w.row_span)) ||
        (w.text_align !== undefined &&
          !["left", "center", "right"].includes(w.text_align)) ||
        (w.date_range_days !== undefined &&
          ![0, 7, 30, 90].includes(w.date_range_days)) ||
        !isValidDate(w.date_from) ||
        !isValidDate(w.date_to) ||
        (w.date_from && w.date_to && w.date_from > w.date_to)
      )
        throw new ReportingError(400, "Invalid display settings");
      if (
        w.source_form_id !== null &&
        !data.forms.some((f) => f.id === w.source_form_id)
      )
        throw new ReportingError(400, "Invalid source");
      if (
        w.source_field_id !== null &&
        !data.fields.some(
          (f) => f.id === w.source_field_id && f.formId === w.source_form_id,
        )
      )
        throw new ReportingError(400, "Invalid field");
      if (
        w.aggregation !== "count" &&
        !data.fields.some((f) => f.id === w.source_field_id && f.numeric)
      )
        throw new ReportingError(400, "Numeric field required");
      if (
        w.widget_type === "chart" &&
        !["line", "bar", "pie", "donut"].includes(w.chart_type)
      )
        throw new ReportingError(400, "Invalid chart");
      if (
        w.widget_type === "comparison" &&
        (!["target", "capacity", "previous_period"].includes(
          w.comparison_mode,
        ) ||
          (w.comparison_mode !== "previous_period" &&
            !(
              typeof w.target_value === "number" &&
              Number.isFinite(w.target_value) &&
              w.target_value > 0
            )))
      )
        throw new ReportingError(400, "Invalid target");
      return {
        grid_span: w.grid_span ?? 1,
        row_span: w.row_span ?? 1,
        text_align: w.text_align ?? "left",
        date_range_days: w.date_range_days ?? 0,
        date_from: w.date_from ?? null,
        date_to: w.date_to ?? null,
        widget_type: w.widget_type,
        title: w.title.trim(),
        source_form_id: w.source_form_id,
        source_field_id: w.source_field_id,
        aggregation: w.aggregation,
        chart_type: w.widget_type === "chart" ? w.chart_type : null,
        comparison_mode:
          w.widget_type === "comparison" ? w.comparison_mode : null,
        target_value:
          w.widget_type === "comparison" &&
          w.comparison_mode !== "previous_period"
            ? w.target_value
            : null,
        display_order: i,
      };
    });
  await saveLayoutWidgets(data.eventId, userId, widgets);
  return getReportingData(userId, locale);
}
