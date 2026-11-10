"use client";

import EventDetailsForm from "@/components/event/setup/EventDetailsForm";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function EventDetailsPanel() {
  const t = useTranslations("eventHome");
  const { workspace, error, loading, retry, identity, userId, locale } =
    useEventWorkspace();
  if (loading)
    return (
      <div
        role="status"
        aria-label={t("loading")}
        aria-busy="true"
        className="space-y-6"
      >
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (error || !workspace || !userId)
    return (
      <div className="space-y-4">
        <p role="status" className="text-gray-700 dark:text-gray-300">
          {t(error ? "loadError" : "noEvent")}
        </p>
        {error && <Button onClick={retry}>{t("retry")}</Button>}
        <Link
          href="/event"
          className="block text-event-action dark:text-brand-400"
        >
          {t("details.back")}
        </Link>
      </div>
    );
  return (
    <EventDetailsForm
      key={identity}
      workspace={workspace}
      userId={userId}
      locale={locale}
    />
  );
}
