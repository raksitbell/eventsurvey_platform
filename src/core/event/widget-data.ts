import { localDay } from "@/core/analytics/policy";
import type {
  DashboardWidget,
  ReportingData,
  ResponseRow,
} from "@/types/event/reporting";

const DAY_MS = 86_400_000;
const ROLLING_DAY_PRESETS = [7, 30, 90];

export function reportingDay(iso: string): string {
  return localDay(iso, "Asia/Bangkok");
}

function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(day) + days * DAY_MS).toISOString().slice(0, 10);
}

function aggregate(
  widget: DashboardWidget,
  rows: ResponseRow[],
): number | null {
  if (widget.aggregation === "count") return rows.length;

  const values = rows.flatMap((row) => {
    const value = row.answers.find(
      (answer) => answer.fieldId === widget.source_field_id,
    )?.value;
    return value !== undefined && value !== "" && Number.isFinite(Number(value))
      ? [Number(value)]
      : [];
  });
  if (!values.length) return null;

  switch (widget.aggregation) {
    case "average":
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case "sum":
      return values.reduce((sum, value) => sum + value, 0);
    case "minimum":
      return Math.min(...values);
    case "maximum":
      return Math.max(...values);
    case "percentage":
      return (values.filter((value) => value > 0).length / rows.length) * 100;
  }
}

export function widgetData(
  widget: DashboardWidget,
  data: ReportingData,
  now = Date.now(),
) {
  const requestedDays = widget.date_range_days ?? 0;
  const rollingDays = ROLLING_DAY_PRESETS.includes(requestedDays)
    ? requestedDays
    : 0;
  const today = reportingDay(new Date(now).toISOString());
  const from = rollingDays
    ? shiftDay(today, 1 - rollingDays)
    : (widget.date_from ??
      (data.eventStartsAt ? reportingDay(data.eventStartsAt) : null));
  const to = rollingDays
    ? today
    : (widget.date_to ??
      (data.eventEndsAt ? reportingDay(data.eventEndsAt) : null));
  const scopedRows = data.responses
    .filter(
      (row) => !widget.source_form_id || row.formId === widget.source_form_id,
    )
    .map((row) => ({ row, day: reportingDay(row.submittedAt) }));
  const current = scopedRows.filter(
    ({ row, day }) =>
      (!from || day >= from) &&
      (!to || day <= to) &&
      (!rollingDays || Date.parse(row.submittedAt) <= now),
  );
  const value = aggregate(
    widget,
    current.map(({ row }) => row),
  );

  const groups = new Map<string, { label: string; count: number }>();
  function addGroup(id: string, label: string) {
    const group = groups.get(id);
    if (group) group.count += 1;
    else groups.set(id, { label, count: 1 });
  }
  for (const { row, day } of current) {
    if (!widget.source_field_id) {
      addGroup(day, day);
      continue;
    }
    const answer = row.answers.find(
      (item) => item.fieldId === widget.source_field_id,
    );
    if (answer?.selectedOptions) {
      for (const option of answer.selectedOptions) {
        addGroup(option.id, option.label);
      }
    } else if (answer?.value) {
      addGroup(answer.value, answer.value);
    }
  }

  let comparison: number | null = null;
  if (widget.comparison_mode === "previous_period") {
    if (from && to && value !== null) {
      const duration = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
      if (duration > 0) {
        const previousFrom = shiftDay(from, -duration);
        const previousThrough = now - duration * DAY_MS;
        const previous = aggregate(
          widget,
          scopedRows
            .filter(
              ({ row, day }) =>
                day >= previousFrom &&
                day < from &&
                (!rollingDays ||
                  Date.parse(row.submittedAt) <= previousThrough),
            )
            .map(({ row }) => row),
        );
        if (previous) comparison = ((value - previous) / previous) * 100;
      }
    }
  } else if (widget.target_value && value !== null) {
    comparison = (value / widget.target_value) * 100;
  }

  return {
    value,
    comparison,
    dateRange: { from, to },
    groups: [...groups.values()]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(({ label, count }) => [label, count] as const),
  };
}
