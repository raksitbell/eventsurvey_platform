"use client";

import Button from "@/components/ui/button/Button";
import { panelClass } from "@/components/event/reports/ReportShell";
import { HandRaisedIcon } from "@heroicons/react/24/outline";
import type { DashboardWidget } from "@/types/event/reporting";
import { useTranslations } from "next-intl";
import React from "react";

interface DashboardToolbarProps {
  eventName: string;
  canManage: boolean;
  isEditing: boolean;
  dirty: boolean;
  pending: boolean;
  widgetCount: number;
  draggingNewType?: DashboardWidget["widget_type"] | null;
  onToggleEdit: () => void;
  onAddWidget: (type: DashboardWidget["widget_type"]) => void;
  onStartPointerDragNew?: (
    type: DashboardWidget["widget_type"],
    e: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onLoadDraft: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export default function DashboardToolbar({
  eventName,
  canManage,
  isEditing,
  dirty,
  pending,
  widgetCount,
  draggingNewType,
  onToggleEdit,
  onAddWidget,
  onStartPointerDragNew,
  onLoadDraft,
  onSaveDraft,
  onPublish,
}: DashboardToolbarProps) {
  const t = useTranslations("eventReports");

  return (
    <div className={`${panelClass} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-theme-xl font-semibold text-gray-900 dark:text-white">
              {eventName}
            </h2>
            {dirty && (
              <span className="rounded-full bg-warning-50 px-3 py-0.5 text-theme-sm font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
                {t("builder.unsaved")}
              </span>
            )}
          </div>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {t(canManage ? "builder.draftHint" : "builder.readOnly")}
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={onToggleEdit}
            >
              {t(isEditing ? "builder.done" : "builder.customize")}
            </Button>
            {isEditing && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={onLoadDraft}
                >
                  {t("builder.loadDraft")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={onSaveDraft}
                >
                  {t("builder.save")}
                </Button>
                <Button size="sm" disabled={pending} onClick={onPublish}>
                  {t(pending ? "loading" : "builder.publish")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {canManage && isEditing && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3.5 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="me-1 text-theme-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {t("builder.widgets")}:
            </span>
            {(["number", "comparison", "chart"] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={pending || widgetCount >= 24}
                onPointerDown={(e) => {
                  if (pending || widgetCount >= 24 || e.button !== 0) return;
                  if (onStartPointerDragNew) {
                    onStartPointerDragNew(type, e);
                  } else {
                    onAddWidget(type);
                  }
                }}
                className={`inline-flex cursor-grab touch-none items-center gap-2 rounded-xl border px-3.5 py-2 text-theme-sm font-medium select-none transition duration-200 active:scale-95 active:cursor-grabbing disabled:opacity-50 ${
                  draggingNewType === type
                    ? "scale-95 border-brand-500 bg-brand-50 text-brand-600 shadow-theme-sm dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-400"
                    : "border-gray-200 bg-gray-50 text-gray-700 shadow-theme-xs hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 hover:shadow-theme-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                }`}
              >
                <HandRaisedIcon className="size-4 text-brand-500 dark:text-brand-400" />
                <span>+ {t(`builder.${type}`)}</span>
              </button>
            ))}
          </div>

          <p className="text-theme-sm text-gray-400 dark:text-gray-500">
            {t("builder.drag")} · {t("builder.grid")}
          </p>
        </div>
      )}
    </div>
  );
}
