"use client";

import { useTranslations } from "next-intl";

const SHORT_TEXT_MAX_LENGTH = 255;

interface PreviewShortTextProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PreviewShortText({
  value,
  onChange,
}: PreviewShortTextProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <div className="flex max-w-md flex-col gap-1">
      <input
        type="text"
        maxLength={SHORT_TEXT_MAX_LENGTH}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.slice(0, SHORT_TEXT_MAX_LENGTH))
        }
        placeholder={tPreview("yourAnswer")}
        className="w-full border-b border-gray-300 bg-transparent pb-1.5 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
      />
      <div
        className={`flex justify-end text-xs ${
          value.length >= SHORT_TEXT_MAX_LENGTH
            ? "font-medium text-amber-600"
            : "text-gray-400"
        }`}
      >
        {value.length} / {SHORT_TEXT_MAX_LENGTH}
      </div>
    </div>
  );
}
