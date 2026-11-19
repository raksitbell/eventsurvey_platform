"use client";

import DateTimePicker from "@/components/form/DateTimePicker";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { api, ApiError } from "@/core/api";
import { isPastScheduleMinute } from "@/core/event/schedule";
import { shiftBangkokMinute } from "@/core/i18n/bangkok-datetime";
import type { AdminEventListItem } from "@/types/admin/events";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";

export default function SubmitApprovalForm({
  onSubmitted,
}: {
  onSubmitted: (event: AdminEventListItem) => void;
}) {
  const t = useTranslations("eventHome.scheduleEvent");
  const dates = useTranslations("datePicker");
  const fieldId = useId();
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [addressText, setAddressText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const range = { start: startsAt, end: endsAt };
  const lastStart = shiftBangkokMinute(endsAt, -1);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!startsAt || !endsAt) {
      setError(t("error"));
      return;
    }
    if (isPastScheduleMinute(startsAt) || isPastScheduleMinute(endsAt)) {
      setError(dates("pastDate"));
      return;
    }
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      setError(dates("invalidOrder"));
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await api.patch<AdminEventListItem>(
        "/event/workspace/submit-approval",
        {
          startsAt,
          endsAt,
          description: description.trim() || null,
          locationName: locationName.trim() || null,
          addressText: addressText.trim() || null,
        },
      );
      setSuccess(t("success"));
      onSubmitted(result);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.code === "EVENT_SCHEDULE_IN_PAST"
        ? dates("pastDate")
        : t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800"
    >
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {t("title")}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimePicker
          id={`${fieldId}-start`}
          label={t("startsAt")}
          value={startsAt}
          onChange={setStartsAt}
          blockPast
          max={isPastScheduleMinute(lastStart) ? null : lastStart}
          range={range}
        />
        <DateTimePicker
          id={`${fieldId}-end`}
          label={t("endsAt")}
          value={endsAt}
          onChange={setEndsAt}
          blockPast
          min={shiftBangkokMinute(startsAt, 1)}
          range={range}
        />
      </div>

      <div>
        <Label>{t("descriptionField")}</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>{t("locationName")}</Label>
          <Input
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />
        </div>
        <div>
          <Label>{t("addressText")}</Label>
          <Input
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error-600 dark:text-error-400">{error}</p>
      ) : null}
      {success ? (
        <p className="text-sm text-success-600 dark:text-success-400">
          {success}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
