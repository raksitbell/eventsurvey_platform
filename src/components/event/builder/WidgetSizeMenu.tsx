"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronUpIcon, SquaresPlusIcon, StopIcon } from "@heroicons/react/24/outline";

export type ColSpan = 1 | 2 | 3;
export type RowSpan = 1 | 2 | 3;

export const COL_SPAN_OPTIONS: {
  span: ColSpan;
  labelKey: "col1" | "col2" | "col3";
}[] = [
  { span: 1, labelKey: "col1" },
  { span: 2, labelKey: "col2" },
  { span: 3, labelKey: "col3" },
];

export const ROW_SPAN_OPTIONS: {
  span: RowSpan;
  labelKey: "row1" | "row2" | "row3";
}[] = [
  { span: 1, labelKey: "row1" },
  { span: 2, labelKey: "row2" },
  { span: 3, labelKey: "row3" },
];

const PRESET_SIZES: {
  key: "small" | "medium" | "large";
  col: ColSpan;
  row: RowSpan;
  labelKey: "sizeSmall" | "sizeMedium" | "sizeLarge";
  iconSizeClass: string;
}[] = [
  {
    key: "small",
    col: 1,
    row: 1,
    labelKey: "sizeSmall",
    iconSizeClass: "size-3.5",
  },
  {
    key: "medium",
    col: 2,
    row: 2,
    labelKey: "sizeMedium",
    iconSizeClass: "size-4.5",
  },
  {
    key: "large",
    col: 3,
    row: 3,
    labelKey: "sizeLarge",
    iconSizeClass: "size-5.5",
  },
];

export function resolveColSpan(span?: number): ColSpan {
  if (!span) return 1;
  if (span <= 3) return span as ColSpan;
  if (span <= 4) return 1;
  if (span <= 10) return 2;
  return 3;
}

export function resolveRowSpan(span?: number): RowSpan {
  if (!span || span <= 1) return 1;
  if (span === 2) return 2;
  return 3;
}

interface WidgetSizeMenuProps {
  colSpan: ColSpan;
  rowSpan: RowSpan;
  disabled?: boolean;
  placement?: "top" | "bottom";
  onOpenChange?: (open: boolean) => void;
  onChangeSize: (colSpan: ColSpan, rowSpan: RowSpan) => void;
}

export default function WidgetSizeMenu({
  colSpan,
  rowSpan,
  disabled = false,
  onOpenChange,
  onChangeSize,
}: WidgetSizeMenuProps) {
  const t = useTranslations("eventReports");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{
    col: ColSpan;
    row: RowSpan;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeAll = () => {
    setDrawerOpen(false);
    setMatrixOpen(false);
    setHoveredCell(null);
    onOpenChange?.(false);
  };

  const toggleDrawer = () => {
    const next = !drawerOpen;
    setDrawerOpen(next);
    if (!next) {
      setMatrixOpen(false);
      setHoveredCell(null);
    }
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!drawerOpen && !matrixOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        e.target instanceof Node &&
        !menuRef.current.contains(e.target)
      ) {
        closeAll();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAll();
      }
    };

    globalThis.document.addEventListener("mousedown", handlePointerDown);
    globalThis.document.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.document.removeEventListener("mousedown", handlePointerDown);
      globalThis.document.removeEventListener("keydown", handleKeyDown);
    };
  });

  const currentPreset = PRESET_SIZES.find(
    (p) => p.col === colSpan && p.row === rowSpan,
  );
  const displayCol = hoveredCell?.col ?? colSpan;
  const displayRow = hoveredCell?.row ?? rowSpan;

  return (
    <div
      ref={menuRef}
      data-no-drag
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto relative z-20 inline-flex items-center"
    >
      {/* Slide-out Drawer from Bottom to Top */}
      <div
        role="menu"
        aria-label={t("builder.sizeMenu")}
        aria-hidden={!drawerOpen}
        className={`absolute bottom-full end-0 z-50 mb-2 w-56 origin-bottom rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-theme-xl ring-1 ring-gray-900/5 backdrop-blur-xs transition-all duration-250 ease-out dark:border-gray-700 dark:bg-gray-900/95 dark:ring-white/10 ${
          drawerOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1">
          {PRESET_SIZES.map(({ key, col, row, labelKey, iconSizeClass }) => {
            const isCurrent = colSpan === col && rowSpan === row && !matrixOpen;
            const label = t(`builder.${labelKey}`);
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                title={`${label} (${col}×${row})`}
                aria-label={`${label} (${col}×${row})`}
                aria-pressed={isCurrent}
                onClick={() => {
                  onChangeSize(col, row);
                  closeAll();
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-theme-sm font-semibold transition disabled:opacity-50 ${
                  isCurrent
                    ? "bg-brand-50 text-brand-600 shadow-theme-xs dark:bg-brand-500/20 dark:text-brand-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center">
                    <StopIcon className={iconSizeClass} />
                  </span>
                  <span>{label}</span>
                </span>
                <span className="text-theme-xs font-medium tabular-nums text-gray-400 dark:text-gray-500">
                  {col}×{row}
                </span>
              </button>
            );
          })}

          <div className="my-0.5 h-px bg-gray-100 dark:bg-gray-800" />

          {/* Custom (ปรับแต่งเอง) option toggling the 3x3 matrix */}
          <button
            type="button"
            disabled={disabled}
            title={t("builder.sizeCustom")}
            aria-label={t("builder.sizeCustom")}
            aria-expanded={matrixOpen}
            onClick={() => setMatrixOpen((prev) => !prev)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-theme-sm font-semibold transition disabled:opacity-50 ${
              matrixOpen || !currentPreset
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            <span className="inline-flex items-center gap-2.5">
              <span className="inline-flex size-6 shrink-0 items-center justify-center">
                <SquaresPlusIcon className="size-5" />
              </span>
              <span>{t("builder.sizeCustom")}</span>
            </span>
            <span
              className={`text-theme-xs font-medium tabular-nums ${
                matrixOpen || !currentPreset
                  ? "text-white/90"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {!currentPreset ? `${colSpan}×${rowSpan}` : "3×3"}
            </span>
          </button>
        </div>

        {/* Expandable 9-Cell (3x3) Custom Matrix inside the bottom-to-top drawer */}
        {matrixOpen && (
          <div className="mt-2 border-t border-gray-100 pt-2.5 dark:border-gray-800">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="text-theme-xs font-semibold text-gray-600 dark:text-gray-300">
                {t("builder.quickGrid2D")}
              </span>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-theme-xs font-semibold tabular-nums text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {displayCol}×{displayRow}
              </span>
            </div>

            <div
              onMouseLeave={() => setHoveredCell(null)}
              className="grid grid-cols-3 gap-1.5 rounded-xl border border-gray-100 bg-gray-50/80 p-2 dark:border-gray-800 dark:bg-gray-800/60"
            >
              {ROW_SPAN_OPTIONS.map(({ span: rSpan }) =>
                COL_SPAN_OPTIONS.map(({ span: cSpan }) => {
                  const isWithinSelection =
                    cSpan <= displayCol && rSpan <= displayRow;
                  const isExactCurrent =
                    cSpan === colSpan && rSpan === rowSpan;

                  return (
                    <button
                      key={`${cSpan}x${rSpan}`}
                      type="button"
                      onMouseEnter={() =>
                        setHoveredCell({ col: cSpan, row: rSpan })
                      }
                      onClick={() => {
                        onChangeSize(cSpan, rSpan);
                        closeAll();
                      }}
                      title={`${t("builder.colsUnit", { count: cSpan })} × ${t("builder.rowsUnit", { count: rSpan })}`}
                      className={`flex h-9 items-center justify-center rounded-lg border text-theme-xs font-semibold tabular-nums transition-all ${
                        isExactCurrent
                          ? "border-brand-600 bg-brand-500 text-white shadow-theme-xs dark:border-brand-400 dark:bg-brand-500"
                          : isWithinSelection
                            ? "border-brand-400 bg-brand-100/90 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/25 dark:text-brand-300"
                            : "border-gray-200 bg-white text-gray-400 hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                      }`}
                    >
                      {cSpan}×{rSpan}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Bottom Trigger Button (Click to slide drawer up from bottom to top) */}
      <button
        type="button"
        disabled={disabled}
        title={t("builder.sizeMenu")}
        aria-label={t("builder.sizeMenu")}
        aria-expanded={drawerOpen}
        onClick={toggleDrawer}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-theme-sm font-semibold tabular-nums transition disabled:opacity-50 ${
          drawerOpen
            ? "border-brand-400 bg-brand-50 text-brand-600 shadow-theme-xs dark:border-brand-500/60 dark:bg-brand-500/20 dark:text-brand-300"
            : "border-gray-200 bg-gray-100/90 text-gray-700 hover:border-brand-300 hover:bg-white hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-500/40 dark:hover:text-brand-400"
        }`}
      >
        <ChevronUpIcon
          className={`size-4 shrink-0 text-gray-400 transition-transform duration-300 ${
            drawerOpen ? "rotate-180 text-brand-500" : ""
          }`}
        />
        {currentPreset ? (
          <StopIcon
            className={`${currentPreset.iconSizeClass} shrink-0 text-brand-600 dark:text-brand-400`}
          />
        ) : (
          <SquaresPlusIcon className="size-4.5 shrink-0 text-brand-600 dark:text-brand-400" />
        )}
        <span>
          {currentPreset
            ? t(`builder.${currentPreset.labelKey}`)
            : t("builder.sizeCustom")}{" "}
          · {colSpan}×{rowSpan}
        </span>
      </button>
    </div>
  );
}
