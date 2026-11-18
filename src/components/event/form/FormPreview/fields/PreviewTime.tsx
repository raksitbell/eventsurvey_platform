"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useClickOutside } from "@/hooks/useClickOutside";

interface PreviewTimeProps {
  value: string;
  onChange: (value: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

export default function PreviewTime({ value, onChange }: PreviewTimeProps) {
  const tPreview = useTranslations("form.preview");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  const [selectedHour, selectedMinute] = value ? value.split(":") : ["", ""];

  const handleSelectHour = (hour: string) => {
    const minute = selectedMinute || "00";
    onChange(`${hour}:${minute}`);
  };

  const handleSelectMinute = (minute: string) => {
    const hour = selectedHour || "00";
    onChange(`${hour}:${minute}`);
    setIsOpen(false);
  };

  const handleSetNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    onChange(`${hh}:${mm}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <input
          type="text"
          readOnly
          value={value}
          onClick={() => setIsOpen((prev) => !prev)}
          placeholder={tPreview("selectTime")}
          className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 ps-3.5 pe-16 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />

        <div className="absolute inset-y-0 end-0 flex items-center gap-1 pe-3">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              aria-label={tPreview("clearTime")}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={tPreview("openTimePicker")}
            className="text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400"
          >
            <ClockIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute start-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 grid grid-cols-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{tPreview("timeHour")}</span>
            <span>{tPreview("timeMinute")}</span>
          </div>

          <div className="grid h-48 grid-cols-2 gap-2">
            {/* Hours column */}
            <div className="custom-scrollbar flex flex-col gap-1 overflow-y-auto pe-1">
              {HOURS.map((hour) => {
                const isSelected = selectedHour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => handleSelectHour(hour)}
                    className={`rounded-lg py-1.5 text-center text-sm transition-colors ${
                      isSelected
                        ? "bg-brand-500 font-semibold text-white"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>

            {/* Minutes column */}
            <div className="custom-scrollbar flex flex-col gap-1 overflow-y-auto border-s border-gray-100 ps-2 pe-1 dark:border-gray-800">
              {MINUTES.map((minute) => {
                const isSelected = selectedMinute === minute;
                return (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => handleSelectMinute(minute)}
                    className={`rounded-lg py-1.5 text-center text-sm transition-colors ${
                      isSelected
                        ? "bg-brand-500 font-semibold text-white"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {minute}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
            <button
              type="button"
              onClick={handleSetNow}
              className="rounded px-2 py-1 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/15"
            >
              {tPreview("timeNow")}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded bg-brand-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-600"
            >
              {tPreview("timeOk")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
