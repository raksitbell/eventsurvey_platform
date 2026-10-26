import type { DashboardWidget, ReportingData } from "@/types/event/reporting";
export function widgetData(
  widget: DashboardWidget,
  data: ReportingData,
  now = Date.now(),
) {
  const days = widget.date_range_days ?? 0;
  const rows = data.responses.filter(
    (r) =>
      (!widget.source_form_id || r.formId === widget.source_form_id) &&
      (!days || Date.parse(r.submittedAt) >= now - days * 86400000),
  );
  const values = rows.flatMap((r) => {
    const value = r.answers.find(
      (a) => a.fieldId === widget.source_field_id,
    )?.value;
    return value !== undefined && value !== "" && Number.isFinite(Number(value))
      ? [Number(value)]
      : [];
  });
  let value: number | null = rows.length;
  if (widget.aggregation !== "count") {
    if (!values.length) value = null;
    else if (widget.aggregation === "average")
      value = values.reduce((a, b) => a + b, 0) / values.length;
    else if (widget.aggregation === "sum")
      value = values.reduce((a, b) => a + b, 0);
    else if (widget.aggregation === "minimum") value = Math.min(...values);
    else if (widget.aggregation === "maximum") value = Math.max(...values);
    else
      value = rows.length
        ? (values.filter((v) => v > 0).length / rows.length) * 100
        : null;
  }
  const groups = new Map<string, number>();
  rows.forEach((r) => {
    const label = widget.source_field_id
      ? r.answers.find((a) => a.fieldId === widget.source_field_id)?.value
      : r.submittedAt.slice(0, 10);
    if (label) groups.set(label, (groups.get(label) ?? 0) + 1);
  });
  let comparison: number | null = null;
  if (widget.comparison_mode === "previous_period") {
    const period = days || 7;
    const previous = data.responses.filter(
      (r) =>
        (!widget.source_form_id || r.formId === widget.source_form_id) &&
        Date.parse(r.submittedAt) >= now - period * 2 * 86400000 &&
        Date.parse(r.submittedAt) < now - period * 86400000,
    ).length;
    const current = rows.filter(
      (r) => Date.parse(r.submittedAt) >= now - period * 86400000,
    ).length;
    comparison = previous ? ((current - previous) / previous) * 100 : null;
  } else if (widget.target_value && value !== null)
    comparison = (value / widget.target_value) * 100;
  return {
    value,
    comparison,
    groups: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)),
  };
}
