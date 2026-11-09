"use client";

import { useRef, useState } from "react";
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
          placeholder="HH:mm"
          className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 ps-3.5 pe-16 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-[#5C54D1] focus:outline-none"
        />

        <div className="absolute inset-y-0 end-0 flex items-center gap-1 pe-3">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              aria-label="Clear time"
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Open time picker"
            className="text-gray-500 transition-colors hover:text-[#5C54D1]"
          >
            <ClockIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute start-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-theme-lg">
          <div className="mb-2 grid grid-cols-2 text-center text-xs font-medium text-gray-500">
            <span>HH</span>
            <span>mm</span>
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
                        ? "bg-[#5C54D1] font-semibold text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>

            {/* Minutes column */}
            <div className="custom-scrollbar flex flex-col gap-1 overflow-y-auto border-s border-gray-100 ps-2 pe-1">
              {MINUTES.map((minute) => {
                const isSelected = selectedMinute === minute;
                return (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => handleSelectMinute(minute)}
                    className={`rounded-lg py-1.5 text-center text-sm transition-colors ${
                      isSelected
                        ? "bg-[#5C54D1] font-semibold text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {minute}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={handleSetNow}
              className="rounded px-2 py-1 text-xs font-medium text-[#5C54D1] transition-colors hover:bg-indigo-50"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded bg-[#5C54D1] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#4b43b8]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
