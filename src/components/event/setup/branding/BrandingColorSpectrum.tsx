"use client";

import { hsvToHex } from "@/core/event/branding-colors";
import type { BrandingHsv } from "@/core/event/branding-colors";
import { useTranslations } from "next-intl";
import type { PointerEvent } from "react";

interface BrandingColorSpectrumProps {
  color: BrandingHsv;
  onChange: (color: BrandingHsv) => void;
}
export default function BrandingColorSpectrum({
  color,
  onChange,
}: BrandingColorSpectrumProps) {
  const t = useTranslations("eventBranding.colorPicker");
  const choose = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    onChange({
      ...color,
      saturation: Math.max(
        0,
        Math.min(1, (event.clientX - bounds.x) / bounds.width),
      ),
      brightness:
        1 -
        Math.max(0, Math.min(1, (event.clientY - bounds.y) / bounds.height)),
    });
  };
  return (
    <>
      <div
        dir="ltr"
        aria-label={t("spectrum")}
        className="branding-color-plane relative h-picker-plane shrink-0 touch-none overflow-hidden rounded-preview-control"
        style={{
          backgroundColor: hsvToHex({
            hue: color.hue,
            saturation: 1,
            brightness: 1,
          }),
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          choose(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            choose(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            choose(event);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute z-1 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-theme-xs"
          style={{
            insetInlineStart: `${color.saturation * 100}%`,
            top: `${(1 - color.brightness) * 100}%`,
          }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={color.saturation * 100}
        aria-label={t("saturation")}
        className="sr-only"
        onChange={(event) =>
          onChange({ ...color, saturation: Number(event.target.value) / 100 })
        }
      />
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={color.brightness * 100}
        aria-label={t("brightness")}
        className="sr-only"
        onChange={(event) =>
          onChange({ ...color, brightness: Number(event.target.value) / 100 })
        }
      />
      <label className="text-picker-small font-semibold text-picker-label dark:text-gray-300">
        {t("hue")}
        <input
          type="range"
          dir="ltr"
          min={0}
          max={360}
          step={0.1}
          value={color.hue}
          aria-label={t("hue")}
          onChange={(event) =>
            onChange({ ...color, hue: Number(event.target.value) })
          }
          className="branding-hue mt-2 h-5.5 w-full cursor-pointer appearance-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-event-action"
        />
      </label>
    </>
  );
}
