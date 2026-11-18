"use client";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { Link } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";

export interface EventSetupPageProps {
  workspace: EventWorkspace;
  userId: string;
  locale: string;
}
export default function EventSetupBoundary({
  component: Component,
}: {
  component: ComponentType<EventSetupPageProps>;
}) {
  const t = useTranslations("eventHome");
  const { workspace, userId, locale, identity, loading, error, retry } =
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
  if (!workspace || !userId || error)
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
    <Component
      key={identity}
      workspace={workspace}
      userId={userId}
      locale={locale}
    />
  );
}
