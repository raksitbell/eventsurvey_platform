"use client";

import { useConfirm } from "@/hooks/useConfirm";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { TrashIcon } from "@heroicons/react/24/outline";

interface HoldToDeleteButtonProps {
  disabled?: boolean;
  holdDurationMs?: number;
  onDelete: () => void;
}

export default function HoldToDeleteButton({
  disabled = false,
  holdDurationMs = 950,
  onDelete,
}: HoldToDeleteButtonProps) {
  const t = useTranslations("eventReports");
  const { confirm } = useConfirm();
  const keyboardHintId = useId();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const triggeredRef = useRef(false);
  const confirmingRef = useRef(false);

  const stopHolding = useCallback(() => {
    if (rafRef.current !== null) {
      globalThis.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHolding(false);
    setProgress(0);
    triggeredRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        globalThis.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const startHolding = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled || confirmingRef.current || !e.isPrimary || e.button !== 0)
        return;

      triggeredRef.current = false;
      setHolding(true);
      setProgress(0);
      startTimeRef.current = globalThis.performance.now();

      const step = (now: number) => {
        const elapsed = now - startTimeRef.current;
        const pct = Math.min(100, (elapsed / holdDurationMs) * 100);
        setProgress(pct);

        if (pct >= 100 && !triggeredRef.current) {
          triggeredRef.current = true;
          stopHolding();
          onDelete();
          return;
        }
        rafRef.current = globalThis.requestAnimationFrame(step);
      };

      rafRef.current = globalThis.requestAnimationFrame(step);
    },
    [disabled, holdDurationMs, onDelete, stopHolding],
  );

  async function confirmDelete() {
    if (disabled || confirmingRef.current) return;
    confirmingRef.current = true;
    stopHolding();
    try {
      const approved = await confirm({
        title: t("builder.deleteWidgetTitle"),
        message: t("builder.deleteWidgetMessage"),
        variant: "danger",
      });
      if (approved) onDelete();
    } finally {
      confirmingRef.current = false;
    }
  }

  return (
    <button
      type="button"
      data-no-drag
      disabled={disabled}
      title={t("builder.holdToDelete")}
      aria-label={t("builder.holdToDelete")}
      aria-describedby={keyboardHintId}
      aria-haspopup="dialog"
      onClick={(e) => {
        e.stopPropagation();
        if (e.detail === 0) void confirmDelete();
      }}
      onPointerDown={startHolding}
      onPointerUp={stopHolding}
      onPointerLeave={stopHolding}
      onPointerCancel={stopHolding}
      className={`pointer-events-auto relative inline-flex items-center gap-2 overflow-hidden rounded-xl border px-3 py-1.5 text-theme-sm font-medium transition select-none disabled:opacity-50 ${
        holding
          ? "border-error-400 bg-error-50 text-error-700 shadow-theme-xs dark:border-error-400 dark:bg-error-500/15 dark:text-error-300"
          : "border-error-200/80 bg-error-50/70 text-error-600 hover:border-error-300 hover:bg-error-100/70 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
      }`}
    >
      <span className="sr-only" id={keyboardHintId}>
        {t("builder.keyboardDeleteHint")}
      </span>
      {/* Animated red fill bar while holding */}
      <span
        aria-hidden="true"
        style={{ width: `${progress}%` }}
        className="pointer-events-none absolute inset-y-0 start-0 bg-error-500/25 dark:bg-error-400/30"
      />
      <TrashIcon className="relative z-10 size-4 shrink-0" />
      <span className="relative z-10">
        {holding ? t("builder.holdingDelete") : t("builder.holdToDelete")}
      </span>
    </button>
  );
}
