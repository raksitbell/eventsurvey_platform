"use client";

import { getLanguage, languages } from "@/i18n/languages";
import type { Locale } from "@/i18n/routing";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: Locale;
  onChange: (locale: Locale) => void;
  onOpen?: () => void;
  className: string;
  children: ReactNode;
}

/** Compact language control — click cycles TH ↔ EN (no menu). */
export default function EventLanguageDropdown({
  label,
  value,
  onChange,
  onOpen,
  className,
  children,
}: Props) {
  const current = getLanguage(value);

  function cycleLocale() {
    onOpen?.();
    const index = languages.findIndex((language) => language.id === value);
    const next = languages[(index + 1) % languages.length] ?? languages[0];
    if (next.id !== value) onChange(next.id);
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={`${label}: ${current.name}`}
      title={label}
      onClick={cycleLocale}
    >
      {children}
    </button>
  );
}
