"use client";

import Input from "@/components/form/input/InputField";
import { ChevronDownIcon, EyeDropperIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useId, useLayoutEffect, useRef, useState } from "react";

interface BrandingColorPickerProps {
  label: string;
  value: string;
  palette: string[];
  disabled?: boolean;
  onSelect: (color: string) => void;
}

export default function BrandingColorPicker({
  label,
  value,
  palette,
  disabled,
  onSelect,
}: BrandingColorPickerProps) {
  const t = useTranslations("eventBranding.colorPicker");
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hasPalette =
    palette.length > 0 &&
    typeof globalThis.HTMLElement?.prototype.showPopover === "function";

  useLayoutEffect(() => {
    const button = trigger.current;
    const popover = panel.current;
    if (!open || !button || !popover) return;
    const gap = 6;
    const rect = button.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const start =
      globalThis.getComputedStyle(button).direction === "rtl"
        ? rect.right - width
        : rect.left;
    const left = Math.max(
      gap,
      Math.min(start, globalThis.innerWidth - width - gap),
    );
    const above =
      rect.bottom + gap + height > globalThis.innerHeight &&
      rect.top > height + gap;
    popover.style.left = left + "px";
    popover.style.top =
      (above ? rect.top - gap - height : rect.bottom + gap) + "px";
    const active =
      popover.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ??
      popover.querySelector("button");
    active?.focus({ preventScroll: true });

    const dismiss = () => {
      if (popover.matches(":popover-open")) popover.hidePopover();
    };
    globalThis.addEventListener("resize", dismiss);
    globalThis.addEventListener("scroll", dismiss, true);
    return () => {
      globalThis.removeEventListener("resize", dismiss);
      globalThis.removeEventListener("scroll", dismiss, true);
    };
  }, [open, hasPalette]);

  const swatch = (
    <>
      <span
        aria-hidden="true"
        className="h-6 w-7 shrink-0 rounded border border-black/15"
        style={{ backgroundColor: value }}
      />
      <span dir="ltr">{value}</span>
    </>
  );

  return (
    <div className="relative flex min-w-0 items-center rounded-lg border border-gray-300 bg-white text-theme-sm text-gray-800 has-focus-visible:ring-2 has-focus-visible:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
      {hasPalette ? (
        <button
          ref={trigger}
          type="button"
          disabled={disabled}
          popoverTarget={id}
          aria-label={t("bannerPalette", { name: label }) + ", " + value}
          aria-haspopup="dialog"
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-s-lg px-2 enabled:cursor-pointer disabled:opacity-50"
        >
          {swatch}
          <ChevronDownIcon
            className="ms-auto size-4 shrink-0"
            aria-hidden="true"
          />
        </button>
      ) : (
        <div aria-hidden="true" className="flex h-11 items-center gap-2 px-3">
          {swatch}
        </div>
      )}
      <div
        className={
          hasPalette
            ? "relative flex size-11 shrink-0 items-center justify-center border-s border-gray-300 dark:border-gray-600"
            : "absolute inset-0"
        }
      >
        {hasPalette && <EyeDropperIcon className="size-5" aria-hidden="true" />}
        <div className="absolute inset-0">
          <Input
            type="color"
            value={value}
            disabled={disabled}
            aria-label={t("title", { name: label })}
            className="cursor-pointer opacity-0! disabled:cursor-default"
            onChange={(event) =>
              onSelect(event.currentTarget.value.toUpperCase())
            }
          />
        </div>
      </div>
      {hasPalette && (
        <div
          ref={panel}
          id={id}
          popover="auto"
          role="dialog"
          aria-label={t("bannerPalette", { name: label })}
          onToggle={(event) => setOpen(event.newState === "open")}
          onBlur={(event) => {
            if (
              event.relatedTarget &&
              !event.currentTarget.contains(event.relatedTarget) &&
              event.relatedTarget !== trigger.current
            ) {
              event.currentTarget.hidePopover();
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.hidePopover();
            trigger.current?.focus({ preventScroll: true });
          }}
          className="fixed inset-auto m-0 max-w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-800 shadow-theme-lg dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          <div className="flex flex-wrap gap-1">
            {palette.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                aria-label={color}
                aria-pressed={color.toUpperCase() === value.toUpperCase()}
                onClick={() => {
                  onSelect(color);
                  panel.current?.hidePopover();
                  trigger.current?.focus({ preventScroll: true });
                }}
                className="flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-500 aria-pressed:ring-2 aria-pressed:ring-brand-500 dark:hover:bg-gray-800"
              >
                <span
                  className="size-7 rounded border border-black/15"
                  style={{ backgroundColor: color }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
