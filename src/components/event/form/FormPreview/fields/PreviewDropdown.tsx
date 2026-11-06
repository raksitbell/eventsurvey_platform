"use client";

import { useTranslations } from "next-intl";
import { Choice } from "@/types/event/form";

interface PreviewDropdownProps {
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
}

export default function PreviewDropdown({
  choices,
  value,
  onChange,
}: PreviewDropdownProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 focus:border-[#5C54D1] focus:outline-none"
    >
      <option value="">{tPreview("choose")}</option>
      {choices.map((choice) => (
        <option key={choice.id} value={choice.id}>
          {choice.label}
        </option>
      ))}
    </select>
  );
}

