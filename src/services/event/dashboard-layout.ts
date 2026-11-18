import { createHash } from "node:crypto";
import { mockApi } from "@/core/api/mock-client";
import type { DashboardWidget } from "@/types/event/reporting";
import type {
  MockDashboardLayout,
  MockDashboardWidget,
  MockDisplaySize,
} from "@/types/mock";

type Layout = MockDashboardLayout & { published_widget_ids?: string[] };
type StoredWidget = DashboardWidget &
  Partial<
    Pick<
      MockDashboardWidget,
      | "grid_w"
      | "grid_h"
      | "display_size"
      | "date_type"
      | "start_date"
      | "end_date"
    >
  > & {
    publication_revision?: string;
  };
type WidgetSettings = Omit<DashboardWidget, "id" | "layout_id" | "updated_at">;

const q = encodeURIComponent;
const widths: Record<MockDisplaySize, number> = {
  small: 1,
  medium: 2,
  large: 3,
  custom: 1,
};
const periods: Record<string, number> = {
  week: 7,
  month: 30,
  quarter: 90,
};
const periodNames: Record<number, string> = {
  7: "week",
  30: "month",
  90: "quarter",
};

export async function getDashboardLayout(eventId: string) {
  const layouts = await mockApi.get<Layout[]>(
    `/dashboard_layouts?event_id=${q(eventId)}`,
  );
  return layouts.find((layout) => layout.event_id === eventId);
}

export async function getLayoutWidgets(
  layout: Layout | undefined,
): Promise<DashboardWidget[]> {
  if (!layout) return [];
  const stored = await mockApi.get<StoredWidget[]>(
    `/dashboard_widgets?layout_id=${q(layout.id)}`,
  );
  const selected = stored.filter((row) => {
    if (row.layout_id !== layout.id) return false;
    if (layout.published_widget_ids === undefined) {
      return !row.publication_revision;
    }
    return (
      Array.isArray(layout.published_widget_ids) &&
      layout.published_widget_ids.includes(row.id)
    );
  });

  return selected
    .sort((a, b) => a.display_order - b.display_order)
    .map((row) => ({
      id: row.id,
      layout_id: row.layout_id,
      widget_type: row.widget_type,
      title: row.title,
      source_form_id: row.source_form_id,
      source_field_id: row.source_field_id,
      aggregation: row.aggregation,
      chart_type: row.chart_type,
      comparison_mode: row.comparison_mode,
      target_value: row.target_value,
      display_order: row.display_order,
      updated_at: row.updated_at,
      grid_span:
        row.grid_span ?? row.grid_w ?? widths[row.display_size ?? "small"],
      row_span: row.row_span ?? row.grid_h ?? 1,
      text_align: row.text_align,
      date_range_days: row.date_range_days ?? periods[row.date_type ?? ""] ?? 0,
      date_from: row.date_from ?? row.start_date ?? null,
      date_to: row.date_to ?? row.end_date ?? null,
    }));
}

function stableId(value: string): string {
  const hash = createHash("sha256").update(value).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

async function ensureDashboardLayout(
  eventId: string,
  userId: string,
  updatedAt: string,
) {
  const existing = await getDashboardLayout(eventId);
  if (existing) return existing;

  const layout: Layout = {
    id: stableId(`dashboard-layout:${eventId}`),
    event_id: eventId,
    updated_by_user_id: userId,
    updated_at: updatedAt,
    published_widget_ids: [],
  };

  try {
    return await mockApi.post<Layout>("/dashboard_layouts", layout);
  } catch (error) {
    // A concurrent request may have created the layout, or the first write may
    // have committed before its response was lost.
    const saved = await getDashboardLayout(eventId);
    if (saved) return saved;
    throw error;
  }
}

export async function saveLayoutWidgets(
  eventId: string,
  userId: string,
  widgets: readonly WidgetSettings[],
) {
  const updatedAt = new Date().toISOString();
  const layout = await ensureDashboardLayout(eventId, userId, updatedAt);
  const revision = stableId(JSON.stringify([layout.id, widgets]));
  const staged = await mockApi.get<StoredWidget[]>(
    `/dashboard_widgets?layout_id=${q(layout.id)}`,
  );
  const belongsToRevision = (row: StoredWidget, id: string) =>
    row.id === id &&
    row.layout_id === layout.id &&
    row.publication_revision === revision;

  const widgetIds: string[] = [];
  for (const [index, widget] of widgets.entries()) {
    const id = stableId(`${revision}:${index}`);
    widgetIds.push(id);
    if (staged.some((row) => belongsToRevision(row, id))) continue;

    const gridWidth = widget.grid_span ?? 1;
    const row: StoredWidget = {
      ...widget,
      id,
      layout_id: layout.id,
      updated_at: updatedAt,
      publication_revision: revision,
      grid_w:
        gridWidth <= 3
          ? gridWidth
          : gridWidth <= 4
            ? 1
            : gridWidth <= 10
              ? 2
              : 3,
      grid_h: widget.row_span ?? 1,
      display_size: "custom",
      date_type:
        periodNames[widget.date_range_days ?? 0] ??
        (widget.date_from || widget.date_to ? "custom" : null),
      start_date: widget.date_from ?? null,
      end_date: widget.date_to ?? null,
    };

    try {
      await mockApi.post("/dashboard_widgets", row);
    } catch (error) {
      const saved = await mockApi.get<StoredWidget[]>(
        `/dashboard_widgets?id=${q(id)}`,
      );
      if (!saved.some((candidate) => belongsToRevision(candidate, id)))
        throw error;
    }
  }

  // Staged records are never selected by a legacy layout. A single pointer
  // update publishes all widgets together and keeps an interrupted save hidden.
  await mockApi.patch(`/dashboard_layouts/${q(layout.id)}`, {
    published_widget_ids: widgetIds,
    updated_by_user_id: userId,
    updated_at: updatedAt,
  });
}
