"use client";

import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.min.css";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

interface PreviewDateProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PreviewDate({ value, onChange }: PreviewDateProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fpRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;

    const instance = flatpickr(inputRef.current, {
      enableTime: true,
      time_24hr: true,
      dateFormat: "Y-m-d H:i",
      defaultDate: value || undefined,
      disableMobile: true,
      onChange: (_, dateStr) => {
        onChangeRef.current(dateStr);
      },
    });

    fpRef.current = Array.isArray(instance) ? instance[0] : instance;

    return () => {
      fpRef.current?.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fpRef.current) return;
    const currentFormatted = fpRef.current.input.value;
    if (!value && currentFormatted) {
      fpRef.current.clear(false);
    } else if (value && value !== currentFormatted) {
      fpRef.current.setDate(value, false);
    }
  }, [value]);

  return (
    <div className="relative w-full max-w-xs">
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={value}
        placeholder="YYYY-MM-DD HH:mm"
        className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-2.5 ps-3.5 pe-10 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-[#5C54D1] focus:outline-none"
      />
      <button
        type="button"
        onClick={() => fpRef.current?.open()}
        tabIndex={-1}
        aria-label="Open calendar"
        className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-gray-500"
      >
        <CalendarDaysIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
