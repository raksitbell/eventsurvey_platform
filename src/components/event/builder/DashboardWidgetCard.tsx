"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ChevronLeftIcon, HandRaisedIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import HoldToDeleteButton from "./HoldToDeleteButton";
import WidgetPreview from "./WidgetPreview";
import WidgetSettings from "./WidgetSettings";
import WidgetSizeMenu, {
  resolveColSpan,
  resolveRowSpan,
  type ColSpan,
  type RowSpan,
} from "./WidgetSizeMenu";
import type { DrawerPlacement } from "./useDashboardPointerDrag";
import type { DashboardWidget, ReportingData } from "@/types/event/reporting";

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
  data: ReportingData;
  isEditing: boolean;
  canEditCanvas: boolean;
  pending: boolean;
  isSelected: boolean;
  isFocusedForEdit: boolean;
  isBeingDragged: boolean;
  isDropTarget: boolean;
  isMenuOpen: boolean;
  drawerOpen: boolean;
  drawerPlacement: DrawerPlacement;
  onCardRef: (el: HTMLElement | null) => void;
  onDrawerRef: (el: HTMLElement | null) => void;
  onPointerDownCard: (e: React.PointerEvent<HTMLElement>) => void;
  onToggleEditDrawer: () => void;
  onCloseEditDrawer: () => void;
  onPatchWidget: (patch: Partial<DashboardWidget>) => void;
  onRemoveWidget: () => void;
  onMenuOpenChange: (isOpen: boolean) => void;
  onChangeSize: (colSpan: ColSpan, rowSpan: RowSpan) => void;
}

export default function DashboardWidgetCard({
  widget,
  data,
  isEditing,
  canEditCanvas,
  pending,
  isSelected,
  isFocusedForEdit,
  isBeingDragged,
  isDropTarget,
  isMenuOpen,
  drawerOpen,
  drawerPlacement,
  onCardRef,
  onDrawerRef,
  onPointerDownCard,
  onToggleEditDrawer,
  onCloseEditDrawer,
  onPatchWidget,
  onRemoveWidget,
  onMenuOpenChange,
  onChangeSize,
}: DashboardWidgetCardProps) {
  const t = useTranslations("eventReports");
  const activeColSpan = resolveColSpan(widget.grid_span);
  const activeRowSpan = resolveRowSpan(widget.row_span);

  const rowHeightClass =
    activeRowSpan === 3
      ? "min-h-136"
      : activeRowSpan === 2
        ? "min-h-92"
        : "min-h-48";

  return (
    <article
      ref={onCardRef}
      style={
        {
          "--widget-span": activeColSpan,
          "--widget-row-span": activeRowSpan,
        } as React.CSSProperties
      }
      onPointerDown={onPointerDownCard}
      className={`relative col-span-1 flex flex-col justify-between rounded-2xl border p-5 transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out md:col-span-(--widget-span) md:row-span-(--widget-row-span) ${rowHeightClass} ${
        isFocusedForEdit
          ? `z-99995 origin-top scale-[1.015] border-2 border-brand-500 bg-white shadow-theme-xl ring-4 ring-brand-500/35 dark:border-brand-400 dark:bg-gray-900 ${
              activeColSpan === 3 ? "mt-88" : ""
            }`
          : isSelected
            ? "z-40"
            : isMenuOpen
              ? "z-30"
              : ""
      } ${
        canEditCanvas
          ? "cursor-grab touch-none select-none hover:-translate-y-0.5 hover:shadow-theme-md active:cursor-grabbing"
          : ""
      } ${
        isBeingDragged
          ? "border-2 border-dashed border-brand-400 bg-brand-50/25 opacity-35 dark:border-brand-500/50 dark:bg-brand-500/5"
          : isDropTarget
            ? "scale-[1.01] border-2 border-brand-500 bg-brand-50/60 shadow-theme-lg ring-4 ring-brand-500/20 dark:border-brand-400 dark:bg-brand-500/15"
            : !isFocusedForEdit && isSelected
              ? "border-brand-500 bg-brand-25 shadow-theme-sm dark:border-brand-400 dark:bg-brand-500/5"
              : !isFocusedForEdit
                ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                : ""
      }`}
    >
      {/* Dynamic Card-Attached Widget Settings Drawer (Top for Large, Side for Small/Medium) */}
      {isSelected && (
        <aside
          ref={onDrawerRef}
          role="dialog"
          data-no-drag
          aria-label={t("builder.settings")}
          aria-hidden={!drawerOpen}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute z-99999 rounded-2xl border-2 border-brand-500 bg-white p-4 shadow-theme-xl ring-4 ring-brand-500/20 transition-all duration-300 ease-out dark:border-brand-400 dark:bg-gray-900 ${
            drawerPlacement === "right"
              ? `start-full top-0 ms-3.5 origin-top-left starting:-translate-x-3 starting:scale-90 starting:opacity-0 ${
                  activeColSpan === 2
                    ? "w-[min(85vw,22rem)] md:w-[calc(50%-0.5rem)] md:min-w-72"
                    : "w-[min(88vw,25rem)]"
                } ${
                  drawerOpen
                    ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-x-3 scale-90 opacity-0"
                }`
              : drawerPlacement === "left"
                ? `end-full top-0 me-3.5 origin-top-right starting:translate-x-3 starting:scale-90 starting:opacity-0 ${
                    activeColSpan === 2
                      ? "w-[min(85vw,22rem)] md:w-[calc(50%-0.5rem)] md:min-w-72"
                      : "w-[min(88vw,25rem)]"
                  } ${
                    drawerOpen
                      ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
                      : "pointer-events-none translate-x-3 scale-90 opacity-0"
                  }`
                : drawerPlacement === "bottom"
                  ? `inset-x-0 top-full mt-3.5 origin-top-right starting:-translate-y-3 starting:scale-90 starting:opacity-0 ${
                      drawerOpen
                        ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none -translate-y-3 scale-90 opacity-0"
                    }`
                  : `inset-x-0 bottom-full mb-3.5 origin-bottom-right starting:translate-y-3 starting:scale-90 starting:opacity-0 ${
                      drawerOpen
                        ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none translate-y-3 scale-90 opacity-0"
                    }`
          }`}
        >
          <WidgetSettings
            widget={widget}
            data={data}
            disabled={pending}
            change={onPatchWidget}
            onClose={onCloseEditDrawer}
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute size-3.5 rotate-45 border-brand-500 bg-white dark:border-brand-400 dark:bg-gray-900 ${
              drawerPlacement === "right"
                ? "-start-2 top-7 border-s-2 border-b-2"
                : drawerPlacement === "left"
                  ? "-end-2 top-7 border-e-2 border-t-2"
                  : drawerPlacement === "bottom"
                    ? "-top-2 end-7 border-s-2 border-t-2"
                    : "-bottom-2 end-7 border-e-2 border-b-2"
            }`}
          />
        </aside>
      )}

      <div className={`flex-1 ${canEditCanvas ? "pointer-events-none" : ""}`}>
        <WidgetPreview
          widget={widget}
          data={data}
          leadingIcon={
            data.canManage && isEditing ? (
              <span
                title={t("builder.dragToMove")}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400"
              >
                <HandRaisedIcon className="size-5" />
              </span>
            ) : undefined
          }
          headerActions={
            data.canManage && isEditing ? (
              <button
                type="button"
                data-no-drag
                disabled={pending}
                title={t("builder.edit")}
                aria-label={t("builder.edit")}
                aria-expanded={isFocusedForEdit}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEditDrawer();
                }}
                className={`pointer-events-auto inline-flex h-9 shrink-0 items-center rounded-xl border px-2.5 text-theme-sm font-semibold transition-all duration-300 ease-out disabled:opacity-50 ${
                  isFocusedForEdit
                    ? "border-brand-500 bg-brand-500 text-white shadow-theme-xs dark:border-brand-400 dark:bg-brand-500"
                    : "border-gray-200 bg-gray-100/90 text-gray-600 hover:border-brand-300 hover:bg-white hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-400"
                }`}
              >
                <ChevronLeftIcon
                  className={`size-4 shrink-0 transition-transform duration-300 ${
                    isFocusedForEdit
                      ? drawerPlacement === "right"
                        ? "rotate-180 text-white"
                        : drawerPlacement === "left"
                          ? "rotate-0 text-white"
                          : drawerPlacement === "bottom"
                            ? "-rotate-90 text-white"
                            : "rotate-90 text-white"
                      : "rotate-0 text-gray-400"
                  }`}
                />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
                    isFocusedForEdit
                      ? "mx-1.5 max-w-28 opacity-100"
                      : "max-w-0 opacity-0"
                  }`}
                >
                  {t("builder.edit")}
                </span>
                <PencilSquareIcon className="ms-0.5 size-4 shrink-0" />
              </button>
            ) : undefined
          }
        />
      </div>

      {/* Card Footer: Bottom-Left Hold-to-Delete | Bottom-Right Bottom-to-Top Size Drawer */}
      {data.canManage && isEditing && (
        <div
          data-no-drag
          className="relative mt-4 flex min-h-10 items-center justify-between border-t border-gray-100 pt-3.5 dark:border-gray-800/80"
        >
          <HoldToDeleteButton disabled={pending} onDelete={onRemoveWidget} />

          <WidgetSizeMenu
            colSpan={activeColSpan}
            rowSpan={activeRowSpan}
            disabled={pending}
            onOpenChange={onMenuOpenChange}
            onChangeSize={onChangeSize}
          />
        </div>
      )}
    </article>
  );
}
