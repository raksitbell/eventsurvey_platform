"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertIcon } from "@/icons";
import { QuestionFieldProps } from "@/types/event/form";

export default function NumberField({
  question,
  onUpdateNumberBounds,
}: QuestionFieldProps) {
  const tbuilder = useTranslations("form.builder");

  const [minText, setMinText] = useState<string>(() =>
    question.min_value !== undefined && question.min_value !== null
      ? String(question.min_value)
      : "",
  );
  const [maxText, setMaxText] = useState<string>(() =>
    question.max_value !== undefined && question.max_value !== null
      ? String(question.max_value)
      : "",
  );

  const parseBound = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "-") return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleMinChange = (raw: string) => {
    setMinText(raw);
    const minVal = parseBound(raw);
    const maxVal = parseBound(maxText);
    onUpdateNumberBounds?.(minVal, maxVal);
  };

  const handleMaxChange = (raw: string) => {
    setMaxText(raw);
    const minVal = parseBound(minText);
    const maxVal = parseBound(raw);
    onUpdateNumberBounds?.(minVal, maxVal);
  };

  const minVal = parseBound(minText);
  const maxVal = parseBound(maxText);
  const isRangeInvalid =
    minVal !== null && maxVal !== null && minVal > maxVal;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="number"
        step="any"
        disabled
        placeholder={tbuilder("numberPlaceholder")}
        className="mt-1 w-full max-w-md border-b border-gray-300 bg-transparent pb-1.5 text-sm text-gray-600 placeholder:text-gray-400"
      />

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span>{tbuilder("minNumber")}:</span>
          <input
            type="number"
            step="any"
            value={minText}
            onChange={(e) => handleMinChange(e.target.value)}
            placeholder={tbuilder("noLimit")}
            className="w-32 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 focus:border-[#5C54D1] focus:outline-none"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span>{tbuilder("maxNumber")}:</span>
          <input
            type="number"
            step="any"
            value={maxText}
            onChange={(e) => handleMaxChange(e.target.value)}
            placeholder={tbuilder("noLimit")}
            className="w-32 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 focus:border-[#5C54D1] focus:outline-none"
          />
        </label>
      </div>

      {isRangeInvalid && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertIcon className="h-4 w-4 shrink-0" />
          <span>{tbuilder("minGreaterThanMax")}</span>
        </div>
      )}
    </div>
  );
}

