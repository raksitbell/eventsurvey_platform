"use client";

import React, { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useEventReporting } from "@/hooks/useEventReporting";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import { useConfirm } from "@/hooks/useConfirm";
import { showToast } from "@/utils/toast";
import ReportShell, {
  panelClass,
} from "@/components/event/reports/ReportShell";
import DashboardDragGhost from "./DashboardDragGhost";
import DashboardToolbar from "./DashboardToolbar";
import DashboardWidgetCard from "./DashboardWidgetCard";
import { useDashboardPointerDrag } from "./useDashboardPointerDrag";
import type { ColSpan, RowSpan } from "./WidgetSizeMenu";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";

export default function PublishedDashboard() {
  const { data, error, reload } = useEventReporting();
  const { user } = useAuth();

  return (
    <ReportShell
      section="dashboard"
      loading={!data}
      error={error}
      retry={reload}
      wide
    >
      {data && (
        <MainDashboardContent
          key={`${user?.id}:${data.eventId}`}
          initial={data}
        />
      )}
    </ReportShell>
  );
}

function MainDashboardContent({ initial }: { initial: ReportingData }) {
  const t = useTranslations("eventReports");
  const locale = useLocale();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [data, setData] = useState(initial);
  const [widgets, setWidgets] = useState(initial.widgets);
  const [isEditing, setIsEditing] = useState(initial.canManage);
  const [selected, setSelected] = useState(initial.widgets[0]?.id ?? "");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenuWidgetId, setOpenMenuWidgetId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);

  const storageKey = `event-dashboard-draft:${user?.id}:${data.eventId}`;

  const update = useCallback((next: DashboardWidget[]) => {
    setWidgets(next);
    setDirty(true);
  }, []);

  const patchWidget = useCallback(
    (id: string, patch: Partial<DashboardWidget>) => {
      setWidgets((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      );
      setDirty(true);
    },
    [],
  );

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      setSelected((currentSelected) =>
        currentSelected === id ? (remaining[0]?.id ?? "") : currentSelected,
      );
      return remaining;
    });
    setDirty(true);
  }, []);

  const add = useCallback(
    (type: DashboardWidget["widget_type"], index?: number) => {
      setWidgets((prev) => {
        if (prev.length >= 24) return prev;
        const insertAt =
          index === undefined
            ? prev.length
            : Math.max(0, Math.min(index, prev.length));
        const widget: DashboardWidget = {
          id: globalThis.crypto.randomUUID(),
          layout_id: "",
          widget_type: type,
          title: t(`builder.${type}`),
          source_form_id: null,
          source_field_id: null,
          aggregation: "count",
          chart_type: type === "chart" ? "line" : null,
          comparison_mode: type === "comparison" ? "target" : null,
          target_value: type === "comparison" ? 100 : null,
          display_order: insertAt,
          updated_at: new Date().toISOString(),
          grid_span: 1,
          row_span: 1,
          text_align: "left",
          date_range_days: 0,
          date_from: data.eventStartsAt ? data.eventStartsAt.slice(0, 10) : null,
          date_to: data.eventEndsAt ? data.eventEndsAt.slice(0, 10) : null,
        };
        const next = [...prev];
        next.splice(insertAt, 0, widget);
        setDirty(true);
        setIsEditing(true);
        setSelected(widget.id);
        return next;
      });
    },
    [data.eventEndsAt, data.eventStartsAt, t],
  );

  const move = useCallback((id: string, target: number) => {
    setWidgets((prev) => {
      const from = prev.findIndex((w) => w.id === id);
      if (from < 0 || from === target) return prev;
      const next = [...prev];
      const [w] = next.splice(from, 1);
      next.splice(Math.max(0, Math.min(target, next.length)), 0, w);
      setDirty(true);
      return next;
    });
  }, []);

  const {
    canvasRef,
    cardRefs,
    drawerRefs,
    floatingCardRef,
    drawerPlacement,
    dragSession,
    dropTargetIndex,
    focusAndPositionDrawer,
    beginPointerDrag,
  } = useDashboardPointerDrag({
    widgets,
    onMoveWidget: move,
    onAddWidget: add,
    onSelectWidget: setSelected,
  });

  const setWidgetSize = useCallback(
    (id: string, colSpan: ColSpan, rowSpan: RowSpan) => {
      setWidgets((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, grid_span: colSpan, row_span: rowSpan } : w,
        ),
      );
      setDirty(true);
      if (drawerOpen && selected === id) {
        globalThis.requestAnimationFrame(() => {
          focusAndPositionDrawer(id, colSpan);
        });
      }
    },
    [drawerOpen, focusAndPositionDrawer, selected],
  );

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
      globalThis.localStorage.setItem(storageKey, JSON.stringify(widgets));
      setDirty(false);
      void showToast(t("builder.saved"));
    } catch {
      void showToast(t("actionError"), "error");
    }
  }

  function loadDraft() {
    try {
      const raw = globalThis.localStorage.getItem(storageKey);
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
      ) {
        void showToast(t("actionError"), "error");
        return;
      }
      update(draft);
      setSelected(draft[0]?.id ?? "");
    } catch {
      void showToast(t("actionError"), "error");
    }
  }

  const active =
    isEditing && drawerOpen
      ? widgets.find((w) => w.id === selected)
      : undefined;
  const draggedWidget =
    dragSession?.mode === "existing" && dragSession.widgetId
      ? widgets.find((w) => w.id === dragSession.widgetId)
      : undefined;
  const canEditCanvas = data.canManage && isEditing && !pending;
  const isActivelyDragging = Boolean(dragSession);

  return (
    <div className="space-y-5">
      {dragSession && (
        <DashboardDragGhost
          dragSession={dragSession}
          draggedWidget={draggedWidget}
          data={data}
          floatingCardRef={floatingCardRef}
        />
      )}

      <DashboardToolbar
        eventName={data.eventName}
        canManage={data.canManage}
        isEditing={isEditing}
        dirty={dirty}
        pending={pending}
        widgetCount={widgets.length}
        draggingNewType={
          dragSession?.mode === "new" ? dragSession.widgetType : null
        }
        onToggleEdit={() => setIsEditing((prev) => !prev)}
        onAddWidget={(type) => add(type)}
        onStartPointerDragNew={(type, e) => {
          e.preventDefault();
          const width = 340;
          const height = 180;
          beginPointerDrag({
            mode: "new",
            widgetType: type,
            startX: e.clientX,
            startY: e.clientY,
            originLeft: e.clientX - width / 2,
            originTop: e.clientY - 28,
            width,
            height,
          });
        }}
        onLoadDraft={loadDraft}
        onSaveDraft={saveDraft}
        onPublish={() => void publish()}
      />

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <section
          ref={canvasRef}
          className={`${data.canManage && isEditing ? panelClass : ""} xl:col-span-12`}
        >
          <div
            className={`grid grid-cols-1 content-start gap-5 md:grid-cols-3 md:grid-flow-row-dense ${
              data.canManage && isEditing ? "min-h-72" : ""
            }`}
          >
            {widgets.map((widget, index) => {
              const isSelected =
                data.canManage && isEditing && selected === widget.id;
              const isFocusedForEdit =
                Boolean(data.canManage && isEditing && drawerOpen) &&
                selected === widget.id;
              const isBeingDragged =
                isActivelyDragging &&
                dragSession?.mode === "existing" &&
                dragSession.widgetId === widget.id;
              const isDropTarget =
                isActivelyDragging &&
                dropTargetIndex === index &&
                dragSession?.widgetId !== widget.id;
              const isMenuOpen = openMenuWidgetId === widget.id;

              return (
                <DashboardWidgetCard
                  key={widget.id}
                  widget={widget}
                  data={data}
                  isEditing={isEditing}
                  canEditCanvas={canEditCanvas}
                  pending={pending}
                  isSelected={isSelected}
                  isFocusedForEdit={isFocusedForEdit}
                  isBeingDragged={isBeingDragged}
                  isDropTarget={isDropTarget}
                  isMenuOpen={isMenuOpen}
                  drawerOpen={drawerOpen}
                  drawerPlacement={drawerPlacement}
                  onCardRef={(el) => {
                    if (el) cardRefs.current.set(widget.id, el);
                    else cardRefs.current.delete(widget.id);
                  }}
                  onDrawerRef={(el) => {
                    if (el) drawerRefs.current.set(widget.id, el);
                    else drawerRefs.current.delete(widget.id);
                  }}
                  onPointerDownCard={(e) => {
                    if (!canEditCanvas || e.button !== 0) return;
                    const targetEl = e.target as HTMLElement | null;
                    if (targetEl?.closest("[data-no-drag]")) return;
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSelected(widget.id);
                    beginPointerDrag({
                      mode: "existing",
                      widgetId: widget.id,
                      widgetType: widget.widget_type,
                      startX: e.clientX,
                      startY: e.clientY,
                      originLeft: rect.left,
                      originTop: rect.top,
                      width: rect.width,
                      height: rect.height,
                    });
                  }}
                  onToggleEditDrawer={() => {
                    if (isFocusedForEdit) {
                      setDrawerOpen(false);
                    } else {
                      setSelected(widget.id);
                      setDrawerOpen(true);
                      focusAndPositionDrawer(widget.id);
                    }
                  }}
                  onCloseEditDrawer={() => setDrawerOpen(false)}
                  onPatchWidget={(patch) => patchWidget(widget.id, patch)}
                  onRemoveWidget={() => removeWidget(widget.id)}
                  onMenuOpenChange={(isOpen) =>
                    setOpenMenuWidgetId((prev) =>
                      isOpen
                        ? widget.id
                        : prev === widget.id
                          ? null
                          : prev,
                    )
                  }
                  onChangeSize={(nextCol, nextRow) => {
                    setSelected(widget.id);
                    setWidgetSize(widget.id, nextCol, nextRow);
                  }}
                />
              );
            })}
          </div>
          {!widgets.length && (
            <p
              className={`py-10 text-center text-theme-sm transition ${
                isActivelyDragging && dropTargetIndex === 0
                  ? "rounded-xl border-2 border-dashed border-brand-500 bg-brand-50/40 text-brand-600 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-400"
                  : data.canManage && isEditing
                    ? "text-gray-500 dark:text-gray-400"
                    : panelClass
              }`}
            >
              {t("empty")}
            </p>
          )}
        </section>
      </div>

      {/* Dimmed Backdrop (z-99990) while Focused Card + Attached Drawer stay elevated at z-99995 */}
      {data.canManage && isEditing && (
        <div
          aria-hidden="true"
          onClick={() => setDrawerOpen(false)}
          className={`fixed inset-0 z-99990 bg-gray-900/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
            drawerOpen && active
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        />
      )}
    </div>
  );
}
