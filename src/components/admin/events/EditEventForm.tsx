"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { api } from "@/core/api";
import { slugifyFromTitles } from "@/core/validation/admin-events";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { AdminEventDetail, AdminEventListItem } from "@/types/admin/events";
import { showError, showSuccess } from "@/utils/alert";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

type EditEventFormProps = {
  eventId: string;
};

export default function EditEventForm({ eventId }: EditEventFormProps) {
  const t = useTranslations("adminEvents.editForm");
  const tCommon = useTranslations("adminEvents");
  const tc = useTranslations("confirm");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [titleTh, setTitleTh] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditable, setIsEditable] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await api.get<AdminEventDetail>(
          `/admin/events/${encodeURIComponent(eventId)}?locale=${encodeURIComponent(locale)}`,
        );
        if (cancelled) return;
        if (data.status !== "draft") {
          setIsEditable(false);
          setLoadError(t("errors.notDraft"));
          return;
        }
        setIsEditable(true);
        setTitleTh(
          data.translations.find((row) => row.locale === "th")?.title ?? "",
        );
        setTitleEn(
          data.translations.find((row) => row.locale === "en")?.title ?? "",
        );
        setSlug(data.slug);
        setSlugTouched(true);
      } catch {
        if (!cancelled) setLoadError(tCommon("loadError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, locale, t, tCommon]);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugifyFromTitles(titleEn, titleTh));
    }
  }, [slugTouched, titleEn, titleTh]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if ((!titleTh.trim() && !titleEn.trim()) || !slug.trim()) {
      await showError(t("errorTitle"), t("errors.required"), tc("ok"));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch<AdminEventListItem>(
        `/admin/events/${encodeURIComponent(eventId)}?locale=${encodeURIComponent(locale)}`,
        {
          titleTh: titleTh.trim(),
          titleEn: titleEn.trim(),
          slug: slug.trim(),
        },
      );
      await showSuccess(t("successTitle"), t("successSaved"), tc("ok"));
      router.push(`/admin/events/${eventId}`);
    } catch (err) {
      const code = err instanceof Error ? err.message : "generic";
      const message =
        code === "SLUG_EXISTS"
          ? t("errors.slugExists")
          : code === "EVENT_NOT_EDITABLE"
            ? t("errors.notDraft")
            : code === "MOCK_READ_ONLY"
              ? t("errors.mockReadOnly")
              : t("errors.generic");
      await showError(t("errorTitle"), message, tc("ok"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3"
    >
      <h2 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        {t("cardTitle")}
      </h2>

      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>{t("eventNameTh")}</Label>
            <Input
              value={titleTh}
              onChange={(e) => setTitleTh(e.target.value)}
              placeholder={t("eventNameThPlaceholder")}
            />
          </div>
          <div>
            <Label>{t("eventNameEn")}</Label>
            <Input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder={t("eventNameEnPlaceholder")}
            />
          </div>
        </div>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t("eventNameHint")}
        </p>

        <div>
          <Label>
            {t("slug")} <span className="text-error-500">*</span>
          </Label>
          <Input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            placeholder="csi-eventsurvey-2028"
          />
          <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {t("slugHint")}
          </p>
        </div>

        {loadError ? (
          <p className="text-sm text-error-600 dark:text-error-400">{loadError}</p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
          <Link href={`/admin/events/${eventId}`}>
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || !isEditable}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </div>
    </form>
  );
}
