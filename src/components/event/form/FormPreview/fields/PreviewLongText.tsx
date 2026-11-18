"use client";

import { useTranslations } from "next-intl";

const LONG_TEXT_MAX_LENGTH = 5000;

interface PreviewLongTextProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PreviewLongText({
  value,
  onChange,
}: PreviewLongTextProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <div className="flex flex-col gap-1">
      <textarea
        rows={3}
        maxLength={LONG_TEXT_MAX_LENGTH}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.slice(0, LONG_TEXT_MAX_LENGTH))
        }
        placeholder={tPreview("yourAnswer")}
        className="w-full border-b border-gray-300 bg-transparent pb-1.5 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
      />
      <div
        className={`flex justify-end text-xs ${
          value.length >= LONG_TEXT_MAX_LENGTH
            ? "font-medium text-amber-600"
            : "text-gray-400"
        }`}
      >
        {value.length} / {LONG_TEXT_MAX_LENGTH}
      </div>
    </div>
  );
}
