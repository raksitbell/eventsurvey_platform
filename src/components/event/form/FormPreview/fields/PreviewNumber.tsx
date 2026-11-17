"use client";

import { useTranslations } from "next-intl";

interface PreviewNumberProps {
  value: string;
  min?: number | null;
  max?: number | null;
  onChange: (value: string) => void;
}

export default function PreviewNumber({
  value,
  min,
  max,
  onChange,
}: PreviewNumberProps) {
  const tPreview = useTranslations("form.preview");
  const tBuilder = useTranslations("form.builder");

  const hasMin = min !== undefined && min !== null;
  const hasMax = max !== undefined && max !== null;

  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="number"
        step="any"
        min={hasMin ? min : undefined}
        max={hasMax ? max : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={tPreview("yourNumber")}
        className="w-full max-w-xs border-b border-gray-300 bg-transparent pb-1.5 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
      />

      {(hasMin || hasMax) && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {hasMin && (
            <span>
              {tBuilder("minNumber")}: {min}
            </span>
          )}
          {hasMax && (
            <span>
              {tBuilder("maxNumber")}: {max}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

