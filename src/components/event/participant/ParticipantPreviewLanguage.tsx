"use client";

import SelectField from "@/components/form/SelectField";
import { contentLanguageName } from "@/core/event/content";
import type { EventContent } from "@/types/event/content";
import { useLocale, useTranslations } from "next-intl";

interface ParticipantPreviewLanguageProps {
  content: EventContent;
  value: string;
  onChange: (locale: string) => void;
}

export default function ParticipantPreviewLanguage({
  content,
  value,
  onChange,
}: ParticipantPreviewLanguageProps) {
  const locale = useLocale();
  const t = useTranslations("eventPreview");
  return (
    <SelectField
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={t("language")}
      className="max-w-48 bg-white dark:bg-gray-900"
    >
      {content.translations.map(({ localeCode }) => (
        <option key={localeCode} value={localeCode}>
          {contentLanguageName(localeCode, locale)}
        </option>
      ))}
    </SelectField>
  );
}
