"use client";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { Link } from "@/i18n/navigation";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import type { ComponentType, ReactNode } from "react";
import EventSetupRecovery from "./EventSetupRecovery";

export interface EventSetupPageProps {
  workspace: EventWorkspace;
  userId: string;
  locale: string;
}
export default function EventSetupBoundary({
  component: Component,
  recoverDraft = false,
  loadingFallback,
}: {
  component: ComponentType<EventSetupPageProps>;
  recoverDraft?: boolean;
  loadingFallback?: ReactNode;
}) {
  const t = useTranslations("eventHome");
  const { workspace, userId, locale, identity, loading, error, retry } =
    useEventWorkspace({ requireFresh: true });
  if (loading)
    return (
      loadingFallback ?? (
        <div
          role="status"
          aria-label={t("loading")}
          aria-busy="true"
          className="flex min-h-160 flex-col gap-6 rounded-2xl bg-event-page p-4 sm:p-6 dark:bg-gray-950"
        >
          <Skeleton className="h-7 w-48" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
          <div className="mt-auto flex flex-wrap justify-end gap-3">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      )
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
    <>
      {recoverDraft && <EventSetupRecovery key={`recovery:${identity}`} workspace={workspace} userId={userId} locale={locale} />}
      <Component key={identity} workspace={workspace} userId={userId} locale={locale} />
    </>
  );
}
