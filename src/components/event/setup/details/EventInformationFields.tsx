"use client";

import DateTimePicker from "@/components/form/DateTimePicker";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import type { EventDraft } from "@/types/event/setup";
import { useTranslations } from "next-intl";

const textFields = [
  ["eventName", "event-name", "name", 255],
  ["description", "event-description", "descriptionField", 5000],
  ["locationName", "event-location", "location", 500],
] as const;

interface EventInformationFieldsProps {
  draft: EventDraft;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
}

export default function EventInformationFields({
  draft,
  readOnly,
  onChange,
}: EventInformationFieldsProps) {
  const t = useTranslations("eventHome.details");
  return (
    <section className="space-y-5 rounded-2xl bg-white p-6 lg:col-span-3 dark:bg-gray-900">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
        {t("information")}
      </h2>
      {textFields.map(([key, id, label, maxLength]) => (
        <div key={key}>
          <Label htmlFor={id}>{t(label)}</Label>
          <Input
            id={id}
            value={draft[key] ?? ""}
            maxLength={maxLength}
            readOnly={readOnly}
            onChange={(event) => onChange({ [key]: event.target.value })}
            className="bg-event-subtle dark:bg-gray-800"
          />
        </div>
      ))}
      {(
        [
          { key: "startsAt", id: "event-start" },
          { key: "endsAt", id: "event-end" },
        ] as const
      ).map(({ key, id }) => (
        <DateTimePicker
          key={key}
          id={id}
          label={t(key)}
          value={draft[key]}
          readOnly={readOnly}
          onChange={(value) => onChange({ [key]: value })}
        />
      ))}
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        {t("timezone")}
      </p>
    </section>
  );
}
