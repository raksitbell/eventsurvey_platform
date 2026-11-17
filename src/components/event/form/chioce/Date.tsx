"use client";

import { useTranslations } from "next-intl";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

export default function DateField() {
  const tbuilder = useTranslations("form.builder");

  return (
    <div className="flex w-full max-w-60 items-center justify-between border-b border-gray-300 pb-2 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
      <span>{tbuilder("datePlaceholder")}</span>
      <CalendarDaysIcon className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
    </div>
  );
}
