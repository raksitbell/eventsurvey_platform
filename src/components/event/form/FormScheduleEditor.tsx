"use client";

import DateTimePicker from "@/components/form/DateTimePicker";
import Button from "@/components/ui/button/Button";
import { isPastScheduleMinute, scheduleMinuteFloor } from "@/core/event/schedule";
import { registrationOutsideEvent } from "@/core/forms/lifecycle";
import { shiftBangkokMinute } from "@/core/i18n/bangkok-datetime";
import type { FormListData, FormRecord } from "@/types/event/form";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

type Schedule = Pick<FormRecord, "opensAt" | "closesAt">;

interface Props {
  record: FormRecord;
  eventWindow: NonNullable<FormListData["legacyScheduleWindow"]>;
  busy: boolean;
  onCancel: () => void;
  onSchedule: (schedule: Schedule) => Promise<string | null>;
}

export default function FormScheduleEditor({ record, eventWindow, busy, onCancel, onSchedule }: Props) {
  const t = useTranslations("form.builder");
  const errors = useTranslations("form.errors");
  const common = useTranslations("common");
  const [opensAt, setOpensAt] = useState(() => {
    const now = scheduleMinuteFloor();
    const eventStart = Date.parse(eventWindow.startsAt ?? "");
    return record.opensAt ?? new Date(eventStart > now ? eventStart : now).toISOString();
  });
  const [closesAt, setClosesAt] = useState(() =>
    record.closesAt ?? (Date.parse(eventWindow.endsAt ?? "") > Date.parse(opensAt) ? eventWindow.endsAt : null),
  );
  const [error, setError] = useState<string | null>(null);
  const registrationEnd = record.type === "registration" ? eventWindow.endsAt : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (registrationOutsideEvent(registrationEnd, opensAt, closesAt)) {
      setError(errors("REGISTRATION_OUTSIDE_EVENT"));
      return;
    }
    if (isPastScheduleMinute(opensAt) || isPastScheduleMinute(closesAt)) {
      setError(errors("FORM_SCHEDULE_IN_PAST"));
      return;
    }
    if (closesAt && Date.parse(closesAt) <= Date.parse(opensAt)) {
      setError(errors("DATE_RANGE_INVALID"));
      return;
    }
    setError(await onSchedule({ opensAt, closesAt }));
  }

  return (
    <form
      aria-label={t("schedule")}
      onSubmit={submit}
      className="grid min-w-0 gap-3 border-t border-gray-200 pt-3 sm:basis-full sm:grid-cols-2 dark:border-gray-700"
    >
      <DateTimePicker
        id={`form-schedule-${record.type}-opens`}
        label={t("opensAt")}
        value={opensAt}
        onChange={(value) => {
          if (value) setOpensAt(value);
          setError(null);
        }}
        blockPast
        max={registrationEnd}
        readOnly={busy}
      />
      <DateTimePicker
        id={`form-schedule-${record.type}-closes`}
        label={t("closesAt")}
        value={closesAt}
        min={shiftBangkokMinute(opensAt, 1)}
        max={registrationEnd}
        clearLabel={t("clearDate")}
        onChange={(value) => {
          setClosesAt(value);
          setError(null);
        }}
        blockPast
        readOnly={busy}
      />
      {error && <p role="alert" className="text-sm text-error-600 sm:col-span-2 dark:text-error-400">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCancel}>{common("cancel")}</Button>
        <Button type="submit" size="sm" disabled={busy}>{t("schedule")}</Button>
      </div>
    </form>
  );
}
