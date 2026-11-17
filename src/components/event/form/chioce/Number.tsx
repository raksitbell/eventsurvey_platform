"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { QuestionFieldProps } from "@/types/event/form";

function parseBound(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

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

  // Sync local text when min_value / max_value changes from API load or paired language column
  useEffect(() => {
    const extMin = question.min_value ?? null;
    if (parseBound(minText) !== extMin) {
      setMinText(extMin !== null ? String(extMin) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.min_value]);

  useEffect(() => {
    const extMax = question.max_value ?? null;
    if (parseBound(maxText) !== extMax) {
      setMaxText(extMax !== null ? String(extMax) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.max_value]);

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
        className="mt-1 w-full max-w-md border-b border-gray-300 bg-transparent pb-1.5 text-sm text-gray-600 placeholder:text-gray-400 dark:border-gray-700 dark:text-gray-300"
      />

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span>{tbuilder("minNumber")}:</span>
          <input
            type="number"
            step="any"
            value={minText}
            onChange={(e) => handleMinChange(e.target.value)}
            placeholder={tbuilder("noLimit")}
            className="w-32 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span>{tbuilder("maxNumber")}:</span>
          <input
            type="number"
            step="any"
            value={maxText}
            onChange={(e) => handleMaxChange(e.target.value)}
            placeholder={tbuilder("noLimit")}
            className="w-32 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      </div>

      {isRangeInvalid && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-error-600 dark:text-error-400">
          <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
          <span>{tbuilder("minGreaterThanMax")}</span>
        </div>
      )}
    </div>
  );
}
