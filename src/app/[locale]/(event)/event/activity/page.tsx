"use client";

import ErrorPage from "@/components/common/ErrorPage";
import EventActivityPanel from "@/components/event/activity/EventActivityPanel";
import EventWorkspacePageHeader from "@/components/event/workspace/EventWorkspacePageHeader";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { useTranslations } from "next-intl";

export default function EventActivityPage() {
  const t = useTranslations("eventActivity");
  const te = useTranslations("errors.403");
  const { workspace, loading, error } = useEventWorkspace();

  if (!loading && (error || !workspace)) {
    return (
      <ErrorPage
        code="500"
        title={t("loadError")}
        message={t("loadError")}
        backLabel={te("backHome")}
      />
    );
  }

  if (!loading && !workspace?.canViewActivity) {
    return (
      <ErrorPage
        code="403"
        title={te("title")}
        message={te("message")}
        backLabel={te("backHome")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <EventWorkspacePageHeader title={t("title")} description={t("description")} />
      {loading ? (
        <div role="status" aria-label={t("loading")} aria-busy="true" className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : <EventActivityPanel />}
    </div>
  );
}
