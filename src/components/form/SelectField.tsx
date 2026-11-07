"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Native select with end padding so the chevron isn’t flush to the border. */
export default function SelectField({
  className = "",
  children,
  ...props
}: SelectFieldProps) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent py-2.5 ps-3.5 pe-12 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${className}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 end-0 flex w-11 items-center justify-center text-gray-500 dark:text-gray-400">
        <ChevronDownIcon className="size-5" />
      </span>
    </div>
  );
}
