"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/core/api";
import type { EventWorkspace } from "@/types/event/workspace";
import { translateRole } from "@/utils/i18n-labels";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { useEffect, useState } from "react";

export default function EventWorkspacePanel() {
  const t = useTranslations("eventHome");
  const locale = useLocale() as Locale;
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<EventWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        // No userId in the query — the route reads it from the session (BR-008)
        const data = await api.get<EventWorkspace>(
          `/event/workspace?locale=${encodeURIComponent(locale)}`,
        );
        if (!cancelled) setWorkspace(data);
      } catch {
        if (!cancelled) {
          setWorkspace(null);
          setError(t("loadError"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, t, user]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("description")}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("loading")}
          </p>
        ) : error ? (
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
        ) : workspace ? (
          <div className="space-y-3">
            <div>
              <p className="text-theme-xs font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
                {t("currentEvent")}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white/90">
                {workspace.eventName}
              </h2>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {t("status")}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">
                  {t(`eventStatus.${workspace.eventStatus}`)}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">
                  {t("yourRole")}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-800 dark:text-white/90">
                  {workspace.customRoleName
                    ? `${translateRole(tCommon, workspace.userRole)} · ${workspace.customRoleName}`
                    : translateRole(tCommon, workspace.userRole)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("noEvent")}
          </p>
        )}
      </div>
    </div>
  );
}
