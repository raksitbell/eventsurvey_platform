"use client";

import { useTranslations } from "next-intl";

const SHORT_TEXT_MAX_LENGTH = 255;

export default function ShortText() {
  const tbuilder = useTranslations("form.builder");

  return (
    <div className="flex flex-col gap-1">
      <input
        disabled
        maxLength={SHORT_TEXT_MAX_LENGTH}
        placeholder={tbuilder("shortTextPlaceholder")}
        className="mt-2 w-full border-b border-gray-300 bg-transparent pb-1 text-sm text-gray-600 transition-all placeholder:text-gray-400 dark:border-gray-700 dark:text-gray-300"
      />
      <div className="flex justify-end text-xs text-gray-400 dark:text-gray-500">
        0 / {SHORT_TEXT_MAX_LENGTH}
      </div>
    </div>
  );
}
