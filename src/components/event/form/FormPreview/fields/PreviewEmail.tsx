"use client";

import { useTranslations } from "next-intl";

interface PreviewEmailProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PreviewEmail({ value, onChange }: PreviewEmailProps) {
  const tPreview = useTranslations("form.preview");

  return (
    <input
      type="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={tPreview("yourEmail")}
      className="w-full max-w-md border-b border-gray-300 bg-transparent pb-1.5 text-sm text-gray-800 transition-colors placeholder:text-gray-400 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
    />
  );
}

