"use client";

// Adapted from TailAdmin free-nextjs-admin-dashboard/src/components/form/Select.tsx.
// Keep native controlled props and children so labels and options remain localized by callers.
import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/icons";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export default function Select({
  className = "",
  children,
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 ps-4 pe-11 text-theme-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${className}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
        <ChevronDownIcon className="size-5" />
      </span>
    </div>
  );
}
