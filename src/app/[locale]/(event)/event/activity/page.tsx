"use client";

import ErrorPage from "@/components/common/ErrorPage";
import EventActivityPanel from "@/components/event/activity/EventActivityPanel";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { useTranslations } from "next-intl";

export default function EventActivityPage() {
  const t = useTranslations("eventActivity");
  const te = useTranslations("errors.403");
  const { workspace, loading, error } = useEventWorkspace();

  if (loading && !workspace) return null;

  if (error || !workspace) {
    return (
      <ErrorPage
        code="500"
        title={t("loadError")}
        message={t("loadError")}
        backLabel={te("backHome")}
      />
    );
  }

  if (!workspace.canViewActivity) {
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </div>
      <EventActivityPanel />
    </div>
  );
}
