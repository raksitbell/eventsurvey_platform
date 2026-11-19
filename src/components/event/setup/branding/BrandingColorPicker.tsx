"use client";

import Input from "@/components/form/input/InputField";
import { useTranslations } from "next-intl";

interface BrandingColorPickerProps {
  label: string;
  value: string;
  paletteId: string;
  disabled?: boolean;
  onSelect: (color: string) => void;
}

export default function BrandingColorPicker({
  label,
  value,
  paletteId,
  disabled,
  onSelect,
}: BrandingColorPickerProps) {
  const t = useTranslations("eventBranding.colorPicker");

  return (
    <div className="relative flex h-11 min-w-0 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-theme-sm text-gray-800 has-focus-visible:ring-2 has-focus-visible:ring-brand-500 has-disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
      <span
        aria-hidden="true"
        className="h-6 w-7 shrink-0 rounded border border-black/10"
        style={{ backgroundColor: value }}
      />
      <span dir="ltr" aria-hidden="true">
        {value}
      </span>
      <div className="absolute inset-0">
        <Input
          type="color"
          value={value}
          list={paletteId}
          disabled={disabled}
          aria-label={t("title", { name: label })}
          className="cursor-pointer opacity-0! disabled:cursor-default"
          onChange={(event) =>
            onSelect(event.currentTarget.value.toUpperCase())
          }
        />
      </div>
    </div>
  );
}
