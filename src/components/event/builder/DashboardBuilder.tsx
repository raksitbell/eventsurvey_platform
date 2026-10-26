"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useEventReporting } from "@/hooks/useEventReporting";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import Button from "@/components/ui/button/Button";
import { useConfirm } from "@/hooks/useConfirm";
import { showToast } from "@/utils/toast";
import ReportShell, {
  panelClass,
} from "@/components/event/reports/ReportShell";
import WidgetSettings from "./WidgetSettings";
import WidgetPreview from "./WidgetPreview";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";
export default function DashboardBuilder() {
  const state = useEventReporting();
  const { user } = useAuth();
  return (
    <ReportShell
      section="builder"
      wide
      loading={!state.data}
      error={state.error}
      retry={state.reload}
    >
      {state.data && (
        <BuilderEditor
          key={`${user?.id}:${state.data.eventId}`}
          initial={state.data}
        />
      )}
    </ReportShell>
  );
}
function BuilderEditor({ initial }: { initial: ReportingData }) {
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [data, setData] = useState(initial);
  const [widgets, setWidgets] = useState(initial.widgets);
  const [selected, setSelected] = useState(initial.widgets[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const storageKey = `event-dashboard-draft:${user?.id}:${data.eventId}`;
  const active = widgets.find((w) => w.id === selected);
  function update(next: DashboardWidget[]) {
    setWidgets(next);
    setDirty(true);
  }
  function add(type: DashboardWidget["widget_type"]) {
    if (widgets.length >= 24) return;
    const widget: DashboardWidget = {
      id: crypto.randomUUID(),
      layout_id: "",
      widget_type: type,
      title: t(`builder.${type}`),
      source_form_id: null,
      source_field_id: null,
      aggregation: "count",
      chart_type: type === "chart" ? "line" : null,
      comparison_mode: type === "comparison" ? "target" : null,
      target_value: type === "comparison" ? 100 : null,
      display_order: widgets.length,
      updated_at: new Date().toISOString(),
      grid_span: 6,
      date_range_days: 0,
    };
    update([...widgets, widget]);
    setSelected(widget.id);
  }
  function move(id: string, target: number) {
    const from = widgets.findIndex((w) => w.id === id);
    if (from < 0) return;
    const next = [...widgets];
    const [w] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(target, next.length)), 0, w);
    update(next);
  }
  async function publish() {
    if (
      !(await confirm({
        title: t("builder.publish"),
        message: t("builder.publishConfirm"),
      }))
    )
      return;
    setPending(true);
    try {
      const result = await api.post<ReportingData>(
        `/event/dashboard?locale=${locale}`,
        { widgets },
      );
      setData(result);
      setWidgets(result.widgets);
      setSelected(result.widgets[0]?.id ?? "");
      setDirty(false);
      await showToast(t("builder.published"));
    } catch {
      await showToast(t("actionError"), "error");
    } finally {
      setPending(false);
    }
  }
  function saveDraft() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widgets));
      setDirty(false);
      void showToast(t("builder.saved"));
    } catch {
      void showToast(t("actionError"), "error");
    }
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        void showToast(t("builder.noDraft"), "info");
        return;
      }
      const draft = JSON.parse(raw) as DashboardWidget[];
      if (
        !Array.isArray(draft) ||
        draft.length > 24 ||
        draft.some(
          (w) =>
            !w ||
            typeof w.id !== "string" ||
            !["number", "chart", "comparison"].includes(w.widget_type),
        )
      )
        throw new Error();
      update(draft);
      setSelected(draft[0]?.id ?? "");
    } catch {
      void showToast(t("actionError"), "error");
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">{data.eventName}</h2>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {t(data.canManage ? "builder.draftHint" : "builder.readOnly")}
            {dirty ? ` · ${t("builder.unsaved")}` : ""}
          </p>
        </div>
        {data.canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={pending} onClick={loadDraft}>
              {t("builder.loadDraft")}
            </Button>
            <Button variant="outline" disabled={pending} onClick={saveDraft}>
              {t("builder.save")}
            </Button>
            <Button disabled={pending} onClick={() => void publish()}>
              {t(pending ? "loading" : "builder.publish")}
            </Button>
          </div>
        )}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-12">
        {data.canManage && (
          <aside className={`${panelClass} space-y-4 xl:col-span-2`}>
            <h2 className="font-semibold">{t("builder.widgets")}</h2>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {t("builder.drag")}
            </p>
            {(["number", "comparison", "chart"] as const).map((type) => (
              <button
                key={type}
                disabled={pending || widgets.length >= 24}
                draggable={!pending}
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/plain", `new:${type}`)
                }
                onClick={() => add(type)}
                className="w-full rounded-xl border border-gray-200 p-4 text-start text-theme-sm hover:border-brand-400 disabled:opacity-50 dark:border-gray-700 dark:hover:border-brand-500"
              >
                <span className="me-2 text-gray-400 dark:text-gray-500">⠿</span>
                {t(`builder.${type}`)}
              </button>
            ))}
            <p className="rounded-xl bg-brand-50 p-3 text-theme-xs text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {t("builder.tip")}
            </p>
          </aside>
        )}
        <section
          className={`${panelClass} ${data.canManage ? "xl:col-span-7" : "xl:col-span-12"}`}
          onDragOver={(e) => {
            if (data.canManage && !pending) e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!data.canManage || pending) return;
            const id = e.dataTransfer.getData("text/plain");
            if (id.startsWith("new:")) {
              const type = id.slice(4);
              if (["number", "comparison", "chart"].includes(type))
                add(type as DashboardWidget["widget_type"]);
            } else move(id, widgets.length - 1);
          }}
        >
          <h2 className="font-semibold">{t("builder.canvas")}</h2>
          <p className="mt-1 mb-6 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("builder.grid")}
          </p>
          <div className="grid min-h-96 grid-cols-12 content-start gap-4">
            {widgets.map((widget, index) => (
              <article
                key={widget.id}
                style={
                  {
                    "--widget-span": widget.grid_span ?? 6,
                  } as React.CSSProperties
                }
                className={`col-span-12 rounded-xl border p-4 md:col-span-(--widget-span) ${selected === widget.id ? "border-brand-500 bg-brand-25 dark:border-brand-400 dark:bg-brand-500/5" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}
                onDragOver={(e) => {
                  if (data.canManage && !pending) e.preventDefault();
                }}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData("text/plain");
                  if (data.canManage && !pending && !id.startsWith("new:")) {
                    e.preventDefault();
                    e.stopPropagation();
                    move(id, index);
                  }
                }}
              >
                {data.canManage && (
                  <div className="mb-3 flex items-center justify-between gap-2 text-theme-xs">
                    <button
                      disabled={pending}
                      draggable={!pending}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", widget.id)
                      }
                      onClick={() => setSelected(widget.id)}
                      className="cursor-grab text-brand-600 dark:text-brand-400"
                    >
                      ⠿ {t("builder.edit")}
                    </button>
                    <div className="flex gap-2">
                      <button
                        aria-label={t("builder.up")}
                        disabled={pending || index === 0}
                        onClick={() => move(widget.id, index - 1)}
                        className="disabled:opacity-25"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={t("builder.down")}
                        disabled={pending || index === widgets.length - 1}
                        onClick={() => move(widget.id, index + 1)}
                        className="disabled:opacity-25"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                )}
                <WidgetPreview widget={widget} data={data} />
              </article>
            ))}
          </div>
          {!widgets.length && (
            <p className="py-10 text-center text-gray-500 dark:text-gray-400">
              {t("empty")}
            </p>
          )}
        </section>
        {data.canManage && (
          <aside className={`${panelClass} xl:col-span-3`}>
            <fieldset disabled={pending}>
              {active ? (
                <WidgetSettings
                  widget={active}
                  data={data}
                  change={(patch) =>
                    update(
                      widgets.map((w) =>
                        w.id === active.id ? { ...w, ...patch } : w,
                      ),
                    )
                  }
                  remove={() => {
                    update(widgets.filter((w) => w.id !== active.id));
                    setSelected(
                      widgets.find((w) => w.id !== active.id)?.id ?? "",
                    );
                  }}
                />
              ) : (
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {t("builder.select")}
                </p>
              )}
            </fieldset>
          </aside>
        )}
      </div>
    </div>
  );
}
