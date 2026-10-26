import { mockApi } from "@/core/api/mock-client";
import { getReportingData, ReportingError } from "@/services/event/reporting";
import type { DashboardWidget } from "@/types/event/reporting";
import type { Locale } from "@/i18n/routing";

export async function publishDashboard(
  userId: string,
  locale: Locale,
  input: unknown,
) {
  const data = await getReportingData(userId, locale);
  if (!data.canManage) throw new ReportingError(403, "Forbidden");
  if (!Array.isArray(input) || input.length > 24)
    throw new ReportingError(400, "Invalid widgets");
  const ids = new Set<string>();
  const widgets: DashboardWidget[] = input.map((w, i) => {
    if (
      !w ||
      typeof w !== "object" ||
      typeof w.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(w.id) ||
      ids.has(w.id) ||
      typeof w.title !== "string" ||
      w.title.length > 240 ||
      !["number", "chart", "comparison"].includes(w.widget_type) ||
      !["count", "sum", "average", "minimum", "maximum", "percentage"].includes(
        w.aggregation,
      )
    )
      throw new ReportingError(400, "Invalid widget");
    ids.add(w.id);
    if (
      (w.grid_span !== undefined && ![4, 6, 8, 10, 12].includes(w.grid_span)) ||
      (w.date_range_days !== undefined &&
        ![0, 7, 30, 90].includes(w.date_range_days))
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
      (!["target", "capacity", "previous_period"].includes(w.comparison_mode) ||
        (w.comparison_mode !== "previous_period" &&
          !(
            typeof w.target_value === "number" &&
            Number.isFinite(w.target_value) &&
            w.target_value > 0
          )))
    )
      throw new ReportingError(400, "Invalid target");
    return {
      grid_span: w.grid_span ?? 6,
      date_range_days: w.date_range_days ?? 0,
      id: w.id,
      layout_id: "",
      widget_type: w.widget_type,
      title: w.title.trim(),
      source_form_id: w.source_form_id,
      source_field_id: w.source_field_id,
      aggregation: w.aggregation,
      chart_type: w.widget_type === "chart" ? w.chart_type : null,
      comparison_mode:
        w.widget_type === "comparison" ? w.comparison_mode : null,
      target_value: w.target_value ?? null,
      display_order: i,
      updated_at: new Date().toISOString(),
    };
  });
  const layouts = await mockApi.get<{ id: string; event_id: string }[]>(
    `/dashboard_layouts?event_id=${encodeURIComponent(data.eventId)}`,
  );
  let layout = layouts.find((l) => l.event_id === data.eventId);
  if (!layout)
    layout = await mockApi.post("/dashboard_layouts", {
      id: crypto.randomUUID(),
      event_id: data.eventId,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString(),
    });
  for (const widget of widgets) {
    // New client IDs are replaced server-side to prevent overwriting another event's widget.
    const existing = data.widgets.some((w) => w.id === widget.id);
    const body = {
      ...widget,
      id: existing ? widget.id : crypto.randomUUID(),
      layout_id: layout!.id,
    };
    if (existing)
      await mockApi.patch(
        `/dashboard_widgets/${encodeURIComponent(widget.id)}`,
        body,
      );
    else await mockApi.post("/dashboard_widgets", body);
  }
  for (const old of data.widgets.filter((w) => !ids.has(w.id)))
    await mockApi.delete(`/dashboard_widgets/${encodeURIComponent(old.id)}`);
  await mockApi.patch(`/dashboard_layouts/${encodeURIComponent(layout!.id)}`, {
    updated_by_user_id: userId,
    updated_at: new Date().toISOString(),
  });
  return getReportingData(userId, locale);
}
