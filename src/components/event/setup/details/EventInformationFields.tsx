"use client";
import EventLanguageDropdown from "@/components/event/setup/details/EventLanguageDropdown";
import DateTimePicker from "@/components/form/DateTimePicker";
import {
  emptyEventTranslation,
  getEventContent,
  resolveEventTranslation,
} from "@/core/event/content";
import type { EventContentTranslation } from "@/types/event/content";
import type { EventDraft } from "@/types/event/setup";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Props {
  statusLabel: string;
  draft: EventDraft;
  uiLocale: string;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
}
export default function EventInformationFields({
  draft,
  statusLabel,
  uiLocale,
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventHome.details");
  const s = useTranslations("eventSetup");
  const v = useTranslations("eventSetupDesign");
  const [selectedLocale, setSelectedLocale] = useState<string>();
  const content = getEventContent(draft, uiLocale);
  const translation = resolveEventTranslation(content, selectedLocale);
  const localizedInput = {
    lang: translation.localeCode,
    dir: "auto",
    readOnly,
  };

  function edit(
    key: Exclude<keyof EventContentTranslation, "localeCode">,
    value: string,
  ) {
    onChange({
      content: {
        ...content,
        translations: content.translations.map((item) =>
          item.localeCode === translation.localeCode
            ? { ...item, [key]: value }
            : item,
        ),
      },
    });
  }
  function add(localeCode: string) {
    if (
      readOnly ||
      content.translations.some((item) => item.localeCode === localeCode)
    )
      return;
    onChange({
      content: {
        ...content,
        translations: [
          ...content.translations,
          emptyEventTranslation(localeCode),
        ],
      },
    });
    setSelectedLocale(localeCode);
  }
  return (
    <section className="es-info">
      <header className="es-info-heading">
        <h1 className="es-icon-label es-info-title">{t("information")}</h1>
        <EventLanguageDropdown
          content={content}
          selected={translation.localeCode}
          uiLocale={uiLocale}
          readOnly={readOnly}
          onSelect={setSelectedLocale}
          onAdd={add}
        />
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
          value={translation.title}
          maxLength={255}
          {...localizedInput}
          aria-required="true"
          onChange={(e) => edit("title", e.target.value)}
        />
      </label>
      <label className="es-field es-description" htmlFor="event-description">
        {v("description")}
        <textarea
          className="event-input"
          id="event-description"
          placeholder={v("descriptionPlaceholder")}
          value={translation.description ?? ""}
          maxLength={5000}
          {...localizedInput}
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
            {...localizedInput}
            aria-required="true"
            value={translation.locationName ?? ""}
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
            {...localizedInput}
            value={translation.floorZone ?? ""}
            onChange={(e) => edit("floorZone", e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
