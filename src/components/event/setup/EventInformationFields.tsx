"use client";

import DateTimePicker from "@/components/form/DateTimePicker";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import type { EventDraft } from "@/types/event/setup";
import { useTranslations } from "next-intl";

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
      <div>
        <Label htmlFor="event-name">{t("name")}</Label>
        <Input
          id="event-name"
          value={draft.eventName}
          maxLength={255}
          readOnly={readOnly}
          onChange={(event) => onChange({ eventName: event.target.value })}
          className="bg-event-subtle dark:bg-gray-800"
        />
      </div>
      <div>
        <Label htmlFor="event-description">{t("descriptionField")}</Label>
        <Input
          id="event-description"
          value={draft.description ?? ""}
          maxLength={5000}
          readOnly={readOnly}
          onChange={(event) => onChange({ description: event.target.value })}
          className="bg-event-subtle dark:bg-gray-800"
        />
      </div>
      <div>
        <Label htmlFor="event-location">{t("location")}</Label>
        <Input
          id="event-location"
          value={draft.locationName ?? ""}
          maxLength={500}
          readOnly={readOnly}
          onChange={(event) => onChange({ locationName: event.target.value })}
          className="bg-event-subtle dark:bg-gray-800"
        />
      </div>
      <DateTimePicker
        id="event-start"
        label={t("startsAt")}
        value={draft.startsAt}
        readOnly={readOnly}
        onChange={(startsAt) => onChange({ startsAt })}
      />
      <DateTimePicker
        id="event-end"
        label={t("endsAt")}
        value={draft.endsAt}
        readOnly={readOnly}
        onChange={(endsAt) => onChange({ endsAt })}
      />
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        {t("timezone")}
      </p>
    </section>
  );
}
