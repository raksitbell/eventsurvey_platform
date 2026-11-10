"use client";

import EventWorkspaceCard from "@/components/event/workspace/EventWorkspaceCard";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function EventWorkspacePanel() {
  const t = useTranslations("eventHome");
  const { workspace, error, loading, retry, identity } = useEventWorkspace();
  return (
    <div className="space-y-6 rounded-2xl bg-event-page p-4 sm:p-6 dark:bg-gray-950">
      <header>
        <p className="text-theme-xs font-bold tracking-wide text-event-action dark:text-brand-400">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-title-sm font-semibold text-gray-900 dark:text-white/90">
          {t("title")}
        </h1>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </header>
      {loading ? (
        <WorkspaceSkeleton label={t("loading")} />
      ) : error ? (
        <div
          role="alert"
          className="space-y-4 rounded-2xl border border-error-200 bg-white p-8 dark:border-error-800 dark:bg-gray-900"
        >
          <p className="text-theme-sm text-error-600 dark:text-error-400">
            {t("loadError")}
          </p>
          <Button variant="outline" onClick={retry}>
            {t("retry")}
          </Button>
        </div>
      ) : workspace ? (
        <EventWorkspaceCard key={identity} workspace={workspace} />
      ) : (
        <div
          role="status"
          className="flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-gray-900"
        >
          <CalendarDaysIcon
            className="size-12 text-brand-400 dark:text-brand-500"
            aria-hidden="true"
          />
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("noEvent")}
          </p>
        </div>
      )}
    </div>
  );
}

function WorkspaceSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 md:flex-row dark:border-gray-800 dark:bg-gray-900"
    >
      <Skeleton className="h-96 w-full rounded-xl md:w-2/5" />
      <div className="flex flex-1 flex-col gap-5">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-auto h-12 w-full" />
      </div>
    </div>
  );
}
