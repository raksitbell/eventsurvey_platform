"use client";
import EventLanguageDropdown from "@/components/event/setup/details/EventLanguageDropdown";
import DateTimePicker from "@/components/form/DateTimePicker";
import {
  emptyEventTranslation,
  getEventContent,
  normalizeContentLocale,
  resolveEventTranslation,
} from "@/core/event/content";
import { shiftBangkokMinute } from "@/core/i18n/bangkok-datetime";
import type { EventContentTranslation } from "@/types/event/content";
import type { EventDraft } from "@/types/event/setup";
import { useTranslations } from "next-intl";

interface Props {
  statusLabel: string;
  draft: EventDraft;
  uiLocale: string;
  selectedLocale: string | null;
  onSelectLocale: (locale: string) => void;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
}
export default function EventInformationFields({
  draft,
  statusLabel,
  uiLocale,
  selectedLocale,
  onSelectLocale,
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventHome.details");
  const s = useTranslations("eventSetup");
  const v = useTranslations("eventSetupDesign");
  const content = getEventContent(draft, uiLocale);
  const translation = resolveEventTranslation(content, selectedLocale);
  const range = { start: draft.startsAt, end: draft.endsAt };
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
  function add(code: string) {
    const localeCode = normalizeContentLocale(code);
    if (
      readOnly ||
      !localeCode ||
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
    onSelectLocale(localeCode);
  }
  function remove(localeCode: string) {
    if (readOnly || localeCode === content.defaultLocale) return;
    onChange({
      content: {
        ...content,
        translations: content.translations.filter((item) => item.localeCode !== localeCode),
      },
    });
    if (translation.localeCode === localeCode) onSelectLocale(content.defaultLocale);
  }
  return (
    <section className="es-info">
      <header className="es-info-heading">
        <h2 className="es-icon-label es-info-title">{t("information")}</h2>
        <EventLanguageDropdown
          content={content}
          selected={translation.localeCode}
          uiLocale={uiLocale}
          readOnly={readOnly}
          onSelect={onSelectLocale}
          onAdd={add}
          onRemove={remove}
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
              blockPast
              min={key === "endsAt" ? shiftBangkokMinute(draft.startsAt, 1) : null}
              max={key === "startsAt" ? shiftBangkokMinute(draft.endsAt, -1) : null}
              range={range}
              showBoundsHint={false}
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
