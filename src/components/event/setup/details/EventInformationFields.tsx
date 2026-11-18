"use client";
import EventLanguageDropdown from "@/components/event/workspace/EventLanguageDropdown";
import type { Locale } from "@/i18n/routing";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import DateTimePicker from "@/components/form/DateTimePicker";
import type { EventDraft } from "@/types/event/setup";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

interface Props {
  statusLabel: string;
  draft: EventDraft;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
}
const emptyContent = {
  eventName: "",
  description: "",
  locationName: "",
  locationDetail: "",
};

export default function EventInformationFields({
  draft,
  statusLabel,
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventHome.details");
  const s = useTranslations("eventSetup");
  const v = useTranslations("eventSetupDesign");
  const locale = useLocale() as Locale;
  const [alternate, setAlternate] = useState(false);
  const contentLocale = alternate ? (locale === "th" ? "en" : "th") : locale;
  const content = alternate ? (draft.alternateContent ?? emptyContent) : draft;
  function edit(key: keyof typeof emptyContent, value: string) {
    if (alternate)
      onChange({
        alternateContent: {
          ...emptyContent,
          ...draft.alternateContent,
          [key]: value,
        },
      });
    else onChange({ [key]: value });
  }
  return (
    <section className="es-info">
      <header className="es-info-heading">
        <h1 className="es-icon-label es-info-title">{t("information")}</h1>
        <EventLanguageDropdown
          label={s("contentLanguage")}
          value={contentLocale}
          onChange={(language) => setAlternate(language !== locale)}
          className="es-info-language"
        >
          <span>{v(contentLocale === "th" ? "languageTh" : "languageEn")}</span>
          <ChevronDownIcon className="size-4 shrink-0" aria-hidden="true" />
        </EventLanguageDropdown>
        <span className="es-info-status">
          <i aria-hidden="true" />
          {statusLabel}
        </span>
      </header>
      <label className="es-field es-name" htmlFor="event-name">
        {t("name")} *
        <input
          className="event-input"
          id="event-name"
          placeholder={v("namePlaceholder")}
          value={content.eventName}
          maxLength={255}
          readOnly={readOnly}
          onChange={(e) => edit("eventName", e.target.value)}
        />
      </label>
      <label className="es-field es-description" htmlFor="event-description">
        {v("description")}
        <textarea
          className="event-input"
          id="event-description"
          placeholder={v("descriptionPlaceholder")}
          value={content.description ?? ""}
          maxLength={5000}
          readOnly={readOnly}
          onChange={(e) => edit("description", e.target.value)}
        />
      </label>
      <div className="es-info-schedule">
        <h2 className="es-icon-label es-date-label">{s("dateTime")} *</h2>
        <div className="es-field-pair">
          {(["startsAt", "endsAt"] as const).map((key) => (
            <DateTimePicker
              key={key}
              id={key === "startsAt" ? "event-start" : "event-end"}
              label={v(key === "startsAt" ? "start" : "end")}
              placeholder={v("datePlaceholder")}
              value={draft[key]}
              readOnly={readOnly}
              onChange={(value) => onChange({ [key]: value })}
            />
          ))}
        </div>
      </div>
      <div className="es-field-pair es-venue">
        <label className="es-field" htmlFor="event-location">
          {v("venue")} *
          <input
            className="event-input"
            id="event-location"
            placeholder={v("venuePlaceholder")}
            maxLength={500}
            readOnly={readOnly}
            value={content.locationName ?? ""}
            onChange={(e) => edit("locationName", e.target.value)}
          />
        </label>
        <label className="es-field" htmlFor="event-zone">
          {s("zone")}
          <input
            className="event-input"
            id="event-zone"
            placeholder={v("zonePlaceholder")}
            maxLength={500}
            readOnly={readOnly}
            value={content.locationDetail ?? ""}
            onChange={(e) => edit("locationDetail", e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
