"use client";

import useEventBranding from "@/hooks/useEventBranding";
import type { EventSetupPageProps } from "@/components/event/setup/EventSetupBoundary";
import PublishedOverview from "@/components/event/qr/PublishedOverview";
import { PublicationStatus } from "@/components/event/qr/PublishedEventSummary";
import EventWorkspaceCard from "@/components/event/workspace/EventWorkspaceCard";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import EventWorkspacePageHeader from "./EventWorkspacePageHeader";

function WorkspaceCard({ workspace, userId, locale, published }: EventSetupPageProps & { published: boolean }) {
  const { branding } = useEventBranding(workspace, userId, locale);
  if (published)
    return <PublishedOverview workspace={workspace} branding={branding} />;
  return <EventWorkspaceCard workspace={workspace} banner={branding.banner} />;
}
export default function EventWorkspacePanel() {
  const t = useTranslations("eventHome");
  const overview = useTranslations("eventPublishedView");
  const { workspace, error, loading, retry, identity, userId, locale } =
    useEventWorkspace();
  const published = !loading && !error && !!userId &&
    !!(workspace?.setup?.publication || workspace?.localPublishedAt);
  return (
    <div className="space-y-6 rounded-2xl dark:bg-gray-950">
      <EventWorkspacePageHeader
        title={overview("overview")}
        description={published ? overview("readOnly") : t("description")}
        back={false}
        action={published && workspace && (
          <PublicationStatus closed={workspace.eventStatus === "closed" && !workspace.localPublishedAt} />
        )}
      />
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
      ) : workspace && userId ? (
        <WorkspaceCard
          key={identity}
          published={published}
          workspace={workspace}
          userId={userId}
          locale={locale}
        />
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
