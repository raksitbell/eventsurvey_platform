"use client";

import BrandingColorSpectrum from "@/components/event/setup/branding/BrandingColorSpectrum";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import { Modal } from "@/components/ui/modal";
import {
  BRANDING_COLOR_PRESETS,
  hexToHsv,
  hsvToHex,
} from "@/core/event/branding-colors";
import type { BrandingColorKey } from "@/types/event/branding";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

interface BrandingColorPickerProps {
  colorKey: BrandingColorKey;
  value: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}
export default function BrandingColorPicker({
  colorKey,
  value,
  onSelect,
  onClose,
}: BrandingColorPickerProps) {
  const t = useTranslations("eventBranding");
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState(value);
  const selectColor = (hex: string) => {
    setColor(hexToHsv(hex));
    setHexInput(hex);
    onSelect(hex);
  };
  useEffect(() => {
    const previous = globalThis.document.activeElement as HTMLElement | null;
    const focusFirst = () => panel.current?.querySelector("button")?.focus();
    const keepFocusInside = (event: FocusEvent) => {
      if (!panel.current?.contains(event.target as Node)) focusFirst();
    };
    focusFirst();
    globalThis.document.addEventListener("focusin", keepFocusInside);
    return () => {
      globalThis.document.removeEventListener("focusin", keepFocusInside);
      previous?.focus();
    };
  }, []);
  return (
    <Modal
      isOpen
      onClose={onClose}
      showCloseButton={false}
      labelledBy={titleId}
      closeOnBackdropClick={false}
      backdropClassName="bg-transparent"
      className="max-h-full max-w-branding-picker overflow-y-auto border border-picker-border px-4.5 py-4 shadow-none dark:border-gray-700"
    >
      <div
        ref={panel}
        className="flex flex-col gap-2.25"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = panel.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled)",
          );
          if (!controls?.length) return;
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && globalThis.document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            globalThis.document.activeElement === last
          ) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <header className="flex h-7.5 shrink-0 items-center justify-between gap-2">
          <h2
            id={titleId}
            className="text-picker-heading font-semibold text-picker-text dark:text-white/90"
          >
            {t("colorPicker.title", {
              name:
                colorKey === "accent" ? t("colorPicker.accent") : t(colorKey),
            })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex size-7.5 items-center justify-center rounded-lg bg-picker-close text-picker-label dark:bg-gray-800 dark:text-gray-300"
          >
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        </header>
        <p className="text-picker-small text-picker-muted dark:text-gray-400">
          {t("colorPicker.hint")}
        </p>
        <BrandingColorSpectrum
          color={color}
          onChange={(next) => {
            setColor(next);
            const hex = hsvToHex(next);
            setHexInput(hex);
            onSelect(hex);
          }}
        />
        <div className="flex h-10 shrink-0 items-center gap-2.5">
          <Input
            type="color"
            value={value}
            aria-label={t("colorPicker.native")}
            onChange={(event) => selectColor(event.target.value.toUpperCase())}
            className="h-9! w-9! cursor-pointer rounded-picker p-0!"
          />
          <div className="flex h-10 flex-col gap-0.5">
            <p className="text-picker-label text-picker-muted dark:text-gray-400">
              {t("colorPicker.selected")}
            </p>
            <Input
              value={hexInput}
              aria-label={t("colorPicker.hex")}
              aria-invalid={!/^#[0-9a-f]{6}$/i.test(hexInput)}
              maxLength={7}
              spellCheck={false}
              dir="ltr"
              onChange={(event) => {
                const hex = event.target.value.toUpperCase();
                setHexInput(hex);
                if (/^#[0-9A-F]{6}$/.test(hex)) selectColor(hex);
              }}
              onBlur={() => setHexInput(value)}
              className="h-6! w-28! rounded-none! border-0! p-0! text-base! font-semibold text-picker-text shadow-none! dark:text-gray-100"
            />
          </div>
        </div>
        <div className="h-px shrink-0 bg-picker-divider dark:bg-gray-700" />
        <h3 className="text-preview-control font-semibold text-picker-text dark:text-gray-200">
          {t("colorPicker.palette")}
        </h3>
        <div className="flex h-17 shrink-0 items-center justify-between">
          {BRANDING_COLOR_PRESETS[colorKey].map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => selectColor(hex)}
              aria-label={t("colorPicker.selectColor", { color: hex })}
              aria-pressed={value === hex}
              className="flex h-16.5 min-w-0 flex-1 flex-col items-center justify-center gap-1.25 rounded-lg focus-visible:outline-2 focus-visible:outline-event-action"
            >
              <span
                aria-hidden="true"
                className="size-picker-swatch shrink-0 rounded-picker border border-picker-swatch-border dark:border-gray-600"
                style={{ backgroundColor: hex }}
              />
              <span className="text-picker-code text-picker-label dark:text-gray-400">
                {hex}
              </span>
            </button>
          ))}
        </div>
        <div className="flex h-9 shrink-0 items-center">
          <Button
            size="sm"
            onClick={onClose}
            className="h-8.5 w-full bg-event-action py-0! text-theme-xs hover:bg-event-action/90 dark:bg-event-action"
          >
            {t("colorPicker.done")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
