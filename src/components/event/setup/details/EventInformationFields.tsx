"use client";
import DateTimePicker from "@/components/form/DateTimePicker";
import type { EventDraft } from "@/types/event/setup";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

interface Props {
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
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventHome.details");
  const s = useTranslations("eventSetup");
  const locale = useLocale();
  const [alternate, setAlternate] = useState(false);
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
    <section className="event-section space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">{t("information")}</h1>
        <select
          aria-label={s("contentLanguage")}
          value={alternate ? "other" : "base"}
          onChange={(e) => setAlternate(e.target.value === "other")}
          className="event-option"
        >
          <option value="base">
            {s(locale === "th" ? "thai" : "english")}
          </option>
          <option value="other">
            {s(locale === "th" ? "english" : "thai")}
          </option>
        </select>
      </header>
      <label className="block space-y-1 text-sm" htmlFor="event-name">
        {t("name")} *
        <input
          className="event-input"
          id="event-name"
          value={content.eventName}
          maxLength={255}
          readOnly={readOnly}
          onChange={(e) => edit("eventName", e.target.value)}
        />
      </label>
      <label className="block space-y-1 text-sm" htmlFor="event-description">
        {t("descriptionField")}
        <textarea
          className="event-input min-h-20"
          id="event-description"
          value={content.description ?? ""}
          maxLength={5000}
          readOnly={readOnly}
          onChange={(e) => edit("description", e.target.value)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["startsAt", "endsAt"] as const).map((key) => (
          <DateTimePicker
            key={key}
            id={key === "startsAt" ? "event-start" : "event-end"}
            label={t(key) + " *"}
            value={draft[key]}
            readOnly={readOnly}
            onChange={(value) => onChange({ [key]: value })}
          />
        ))}
        <label className="space-y-1 text-sm" htmlFor="event-location">
          {t("location")} *
          <input
            className="event-input"
            id="event-location"
            maxLength={500}
            readOnly={readOnly}
            value={content.locationName ?? ""}
            onChange={(e) => edit("locationName", e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm" htmlFor="event-zone">
          {s("zone")}
          <input
            className="event-input"
            id="event-zone"
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
