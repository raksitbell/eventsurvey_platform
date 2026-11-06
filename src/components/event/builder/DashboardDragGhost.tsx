"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { HandRaisedIcon } from "@/icons";
import WidgetPreview from "./WidgetPreview";
import type { FreeDragSession } from "./useDashboardPointerDrag";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";

interface DashboardDragGhostProps {
  dragSession: FreeDragSession;
  draggedWidget?: DashboardWidget;
  data: ReportingData;
  floatingCardRef: React.RefObject<HTMLDivElement | null>;
}

export default function DashboardDragGhost({
  dragSession,
  draggedWidget,
  data,
  floatingCardRef,
}: DashboardDragGhostProps) {
  const t = useTranslations("eventReports");

  return (
    <div
      ref={floatingCardRef}
      aria-hidden="true"
      style={{
        insetInlineStart: 0,
        top: 0,
        width: `${dragSession.width}px`,
        minHeight:
          dragSession.mode === "existing"
            ? `${dragSession.height}px`
            : undefined,
        transform: `translate3d(${dragSession.initialTransformX}px, ${dragSession.initialTransformY}px, 0) scale(1.03) rotate(-1deg)`,
      }}
      className="pointer-events-none fixed z-99999 rounded-2xl border-2 border-brand-500 bg-white p-5 shadow-theme-xl ring-4 ring-brand-500/20 will-change-transform dark:border-brand-400 dark:bg-gray-900"
    >
      {dragSession.mode === "existing" &&
      draggedWidget &&
      draggedWidget.widget_type !== "chart" ? (
        <WidgetPreview
          widget={draggedWidget}
          data={data}
          leadingIcon={
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              <HandRaisedIcon className="size-5" />
            </span>
          }
        />
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <HandRaisedIcon className="size-5" />
                </span>
                <h3 className="truncate text-theme-xl font-semibold text-gray-900 dark:text-white">
                  {dragSession.mode === "existing" && draggedWidget
                    ? draggedWidget.title ||
                      t(`builder.${draggedWidget.widget_type}`)
                    : t(`builder.${dragSession.widgetType}`)}
                </h3>
              </div>
              <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                {draggedWidget
                  ? (data.forms.find(
                      (f) => f.id === draggedWidget.source_form_id,
                    )?.title ?? t("builder.allForms"))
                  : t("builder.allForms")}
              </p>
            </div>
            {dragSession.mode === "new" && (
              <span className="rounded-lg bg-brand-50 px-2.5 py-0.5 text-theme-sm font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                + New
              </span>
            )}
          </div>
          {(draggedWidget?.widget_type ?? dragSession.widgetType) ===
          "chart" ? (
            <div className="mt-4 flex h-28 items-end gap-2.5 pt-2">
              <span className="h-12 flex-1 rounded-t-md bg-brand-500/70" />
              <span className="h-20 flex-1 rounded-t-md bg-brand-500" />
              <span className="h-10 flex-1 rounded-t-md bg-brand-500/60" />
              <span className="h-24 flex-1 rounded-t-md bg-brand-500" />
              <span className="h-16 flex-1 rounded-t-md bg-brand-500/80" />
            </div>
          ) : (
            <p className="mt-4 text-title-md font-bold text-gray-900 dark:text-white">
              {data.responses.length}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
