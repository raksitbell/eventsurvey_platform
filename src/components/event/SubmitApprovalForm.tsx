"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { api } from "@/core/api";
import type { AdminEventListItem } from "@/types/admin/events";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

function toIsoOrNull(localValue: string): string | null {
  if (!localValue) return null;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function SubmitApprovalForm({
  onSubmitted,
}: {
  onSubmitted: (event: AdminEventListItem) => void;
}) {
  const t = useTranslations("eventHome.scheduleEvent");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [addressText, setAddressText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const startsAtIso = toIsoOrNull(startsAt);
    const endsAtIso = toIsoOrNull(endsAt);
    if (!startsAtIso || !endsAtIso) {
      setError(t("error"));
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await api.patch<AdminEventListItem>(
        "/event/workspace/submit-approval",
        {
          startsAt: startsAtIso,
          endsAt: endsAtIso,
          description: description.trim() || null,
          locationName: locationName.trim() || null,
          addressText: addressText.trim() || null,
        },
      );
      setSuccess(t("success"));
      onSubmitted(result);
    } catch {
      setError(t("error"));
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
        <div>
          <Label>{t("startsAt")}</Label>
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <Label>{t("endsAt")}</Label>
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
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
        <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
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
