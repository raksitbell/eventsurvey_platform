"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
import { api } from "@/core/api";
import type { AnalyticsData, Widget } from "@/types/event/analytics";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import WidgetSettings from "./WidgetSettings";
import WidgetPalette from "./WidgetPalette";
import BuilderPreview from "./BuilderPreview";
interface Props {
  data: AnalyticsData;
  onSaved: () => void;
}
const panel =
  "rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900";
const select =
  "w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300";
export default function LayoutEditor({ data }: Props) {
  const t = useTranslations("analytics"),
    { user } = useAuth();
  const [dashboardId, setDashboardId] = useState(data.dashboards[0]?.id || "");
  const [allWidgets, setAllWidgets] = useState<Widget[]>(data.widgets);
  const [selectedId, setSelectedId] = useState(
    data.widgets.find((w) => w.dashboard_data_id === dashboardId)?.id || "",
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const widgets = allWidgets.filter((w) => w.dashboard_data_id === dashboardId);
  const selected = widgets.find((w) => w.id === selectedId);
  const dashboard = data.dashboards.find((d) => d.id === dashboardId);
  const draftKey = `eventsurvey-builder:${user?.id}:${data.event.id}`;
  const title = (w: Widget) =>
    data.filters.locale === "th" ? w.title_th : w.title_en;
  function update(w: Widget) {
    setAllWidgets((items) =>
      items.map((item) =>
        item.id === w.id
          ? {
              ...w,
              config_json: {
                ...w.config_json,
                span: w.config_json.span || item.config_json.span || 6,
              },
            }
          : item,
      ),
    );
    setDirty(true);
    setMessage("");
  }
  function add(type: string, index = widgets.length) {
    if (busy || widgets.length >= 30) return;
    const field = data.fields.find((f) => !f.pii);
    if ((type === "bar_chart" || type === "pie_chart") && !field) return;
    if (!["kpi", "bar_chart", "pie_chart", "data_table"].includes(type)) return;
    const chart = type === "bar_chart" || type === "pie_chart";
    const w: Widget = {
      id: crypto.randomUUID(),
      dashboard_data_id: dashboardId,
      type,
      title_th: t(
        type === "kpi"
          ? "builderUi.metric"
          : type === "data_table"
            ? "responses"
            : type === "pie_chart"
              ? "pie"
              : "bar",
      ),
      title_en:
        type === "kpi"
          ? "KPI metric"
          : type === "data_table"
            ? "Latest responses"
            : type === "pie_chart"
              ? "Pie chart"
              : "Bar chart",
      form_id: chart ? field!.formId : null,
      field_id: chart ? field!.id : null,
      config_json:
        type === "kpi"
          ? { metric: "submission_count", span: 6 }
          : type === "data_table"
            ? { mask_pii: true, span: 6 }
            : {
                source: "field_distribution",
                chart: type === "pie_chart" ? "pie" : "bar",
                span: 6,
              },
      display_order: index + 1,
    };
    const ordered = [...widgets];
    ordered.splice(index, 0, w);
    setAllWidgets([
      ...allWidgets.filter((item) => item.dashboard_data_id !== dashboardId),
      ...ordered,
    ]);
    setSelectedId(w.id);
    setDirty(true);
    setMessage("");
  }
  function move(id: string, index: number) {
    const source = widgets.findIndex((w) => w.id === id);
    if (source < 0 || busy) return;
    const next = [...widgets],
      [item] = next.splice(source, 1);
    next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
    setAllWidgets([
      ...allWidgets.filter((w) => w.dashboard_data_id !== dashboardId),
      ...next,
    ]);
    setDirty(true);
  }
  function drop(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    const type = e.dataTransfer.getData("application/eventsurvey-widget");
    if (type) add(type, index);
    else
      move(e.dataTransfer.getData("application/eventsurvey-widget-id"), index);
  }
  function saveDraft() {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          version: 1,
          eventId: data.event.id,
          widgets: allWidgets,
        }),
      );
      setMessage(t("builderUi.draftSaved"));
      setDirty(false);
    } catch {
      setMessage(t("saveError"));
    }
  }
  function restore() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setMessage(t("builderUi.noDraft"));
        return;
      }
      const draft = JSON.parse(raw);
      if (
        draft.version !== 1 ||
        draft.eventId !== data.event.id ||
        !Array.isArray(draft.widgets) ||
        draft.widgets.some(
          (w: Widget) =>
            !w ||
            typeof w.id !== "string" ||
            !data.dashboards.some((d) => d.id === w.dashboard_data_id) ||
            typeof w.title_th !== "string" ||
            typeof w.title_en !== "string" ||
            !w.config_json ||
            !["kpi", "bar_chart", "pie_chart", "data_table"].includes(w.type),
        )
      )
        throw Error();
      setAllWidgets(draft.widgets);
      setSelectedId("");
      setDirty(true);
      setMessage(t("builderUi.draftRestored"));
    } catch {
      setMessage(t("saveError"));
    }
  }
  async function publish() {
    setBusy(true);
    setMessage("");
    try {
      for (const d of data.dashboards)
        await api.patch("/event/analytics/layout", {
          id: d.id,
          columns: d.layout_json.columns,
          widgets: allWidgets.filter((w) => w.dashboard_data_id === d.id),
        });
      setDirty(false);
      setMessage(t("builderUi.published"));
    } catch {
      setMessage(t("saveError"));
    } finally {
      setBusy(false);
    }
  }
  function resize(e: React.PointerEvent<HTMLButtonElement>, w: Widget) {
    e.preventDefault();
    e.stopPropagation();
    const grid = e.currentTarget.closest("[data-builder-canvas]");
    if (!grid) return;
    const width = grid.getBoundingClientRect().width,
      start = e.clientX,
      initial = w.config_json.span || 6,
      rtl = document.documentElement.dir === "rtl";
    const end = (event: PointerEvent) => {
      const delta = (event.clientX - start) * (rtl ? -1 : 1);
      const raw = initial + (delta / width) * 12;
      const span = raw < 5 ? 4 : raw < 9 ? 6 : 12;
      update({ ...w, config_json: { ...w.config_json, span } });
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointerup", end, { once: true });
  }
  if (!dashboard) return <p>{t("empty")}</p>;
  return (
    <div className="space-y-5 text-gray-900 dark:text-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5 dark:border-gray-700">
        <div>
          <Link
            href="/event/analytics"
            className="text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
          >
            ‹ {t("builderUi.back")}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{t("builder")}</h1>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {data.event.title}
            {dirty ? ` · ${t("builderUi.unsaved")}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" disabled={busy} onClick={restore}>
            {t("builderUi.restore")}
          </Button>
          <Button variant="outline" disabled={busy} onClick={saveDraft}>
            {t("builderUi.saveDraft")}
          </Button>
          <Button disabled={busy} onClick={() => void publish()}>
            {busy ? t("saving") : t("builderUi.publish")}
          </Button>
        </div>
      </header>
      {message && (
        <p
          role="status"
          className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
        >
          {message}
        </p>
      )}
      <div className="grid items-stretch gap-4 xl:grid-cols-12">
        <div className="xl:col-span-3 2xl:col-span-2">
          <WidgetPalette
            onAdd={add}
            disabled={busy || widgets.length >= 30}
            canChart={data.fields.some((f) => !f.pii)}
          />
        </div>
        <section
          className={`${panel} min-w-0 p-5 xl:col-span-6 2xl:col-span-7`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t("builderUi.canvas")}</h2>
              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {t("builderUi.grid")}
              </p>
            </div>
            <div className="max-w-xs">
              <Label htmlFor="builder-dashboard">
                {t("builderUi.dashboard")}
              </Label>
              <select
                id="builder-dashboard"
                className={select}
                value={dashboardId}
                disabled={busy}
                onChange={(e) => {
                  setDashboardId(e.target.value);
                  setSelectedId("");
                }}
              >
                {data.dashboards.map((d) => (
                  <option key={d.id} value={d.id}>
                    {data.filters.locale === "th" ? d.title_th : d.title_en}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            data-builder-canvas
            className="relative mt-6 grid min-h-96 grid-cols-12 content-start gap-4 pb-12"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, widgets.length)}
          >
            <div
              className="pointer-events-none absolute inset-0 grid grid-cols-12"
              aria-hidden
            >
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="border-s border-brand-50 dark:border-gray-800"
                />
              ))}
            </div>
            {widgets.map((w, i) => (
              <article
                key={w.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(e, i)}
                className={`relative z-1 col-span-12 min-w-0 rounded-xl border bg-white p-4 dark:bg-gray-900 ${w.id === selectedId ? "border-brand-500 ring-1 ring-brand-500 dark:border-brand-400" : "border-gray-200 dark:border-gray-700"} ${w.config_json.span === 12 ? "" : w.config_json.span === 4 ? "md:col-span-4" : "md:col-span-6"}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    draggable={!busy}
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "application/eventsurvey-widget-id",
                        w.id,
                      )
                    }
                    aria-label={t("builderUi.reorder", { title: title(w) })}
                    className="cursor-grab text-gray-400 active:cursor-grabbing dark:text-gray-500"
                  >
                    ⠿
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setSelectedId(w.id)}
                    aria-pressed={w.id === selectedId}
                    className="min-w-0 flex-1 text-start text-sm font-semibold break-words hover:text-brand-500 dark:hover:text-brand-400"
                  >
                    {title(w)}
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400"
                  onClick={() => setSelectedId(w.id)}
                >
                  {t("builderUi.configure")}
                </button>
                <BuilderPreview widget={w} data={data} />
                <button
                  type="button"
                  disabled={busy}
                  onPointerDown={(e) => resize(e, w)}
                  onClick={() => setSelectedId(w.id)}
                  aria-label={t("builderUi.resize")}
                  className="absolute end-1 bottom-1 cursor-ew-resize p-1 text-gray-400 dark:text-gray-500"
                >
                  ⤡
                </button>
              </article>
            ))}
            <div className="relative z-1 col-span-12 rounded-xl border border-dashed border-brand-400 bg-brand-25 p-5 dark:border-brand-500 dark:bg-brand-500/5">
              <p className="font-medium text-brand-500 dark:text-brand-400">
                {selected
                  ? t("builderUi.selected", { title: title(selected) })
                  : t("builderUi.dropTitle")}
              </p>
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                {t("builderUi.moveHint")}
              </p>
              <button
                type="button"
                disabled={busy || widgets.length >= 30}
                onClick={() => add("kpi")}
                className="mt-6 rounded-lg py-3 text-sm text-brand-500 dark:text-brand-400"
              >
                ＋ {t("builderUi.drop")}
              </button>
            </div>
          </div>
        </section>
        <aside className={`${panel} flex flex-col p-5 xl:col-span-3`}>
          <h2 className="text-lg font-semibold">{t("builderUi.settings")}</h2>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {selected ? title(selected) : t("builderUi.selectHint")}
          </p>
          {selected && (
            <div className="mt-8 flex flex-1 flex-col gap-5">
              <div>
                <Label htmlFor="builder-title-th">{t("titleTh")}</Label>
                <Input
                  id="builder-title-th"
                  value={selected.title_th}
                  disabled={busy}
                  onChange={(e) =>
                    update({ ...selected, title_th: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="builder-title-en">{t("titleEn")}</Label>
                <Input
                  id="builder-title-en"
                  value={selected.title_en}
                  disabled={busy}
                  onChange={(e) =>
                    update({ ...selected, title_en: e.target.value })
                  }
                />
              </div>
              <WidgetSettings
                compact
                widget={selected}
                data={data}
                disabled={busy}
                onChange={update}
              />
              <div>
                <Label htmlFor="builder-width">{t("builderUi.width")}</Label>
                <select
                  id="builder-width"
                  className={select}
                  disabled={busy}
                  value={selected.config_json.span || 6}
                  onChange={(e) =>
                    update({
                      ...selected,
                      config_json: {
                        ...selected.config_json,
                        span: Number(e.target.value),
                      },
                    })
                  }
                >
                  {[4, 6, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} / 12
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || widgets[0]?.id === selected.id}
                  onClick={() =>
                    move(selected.id, widgets.indexOf(selected) - 1)
                  }
                >
                  {t("moveUp")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || widgets.at(-1)?.id === selected.id}
                  onClick={() =>
                    move(selected.id, widgets.indexOf(selected) + 1)
                  }
                >
                  {t("moveDown")}
                </Button>
              </div>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t("builderUi.privacy")}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setAllWidgets(allWidgets.filter((w) => w.id !== selected.id));
                  setSelectedId("");
                  setDirty(true);
                }}
                className="mt-auto rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
              >
                {t("remove")}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
