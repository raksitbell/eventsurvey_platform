"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/core/api";
import { useConfirm } from "@/hooks/useConfirm";
import { Link } from "@/i18n/navigation";
import {
  FORM_TYPES,
  FormListResponse,
  FormLocale,
  FormRecord,
  FormStatus,
  FormType,
} from "@/types/event/form";
import type { EventWorkspace } from "@/types/event/workspace";

function statusBadgeClass(status?: FormStatus, enabled = true): string {
  if (!enabled) {
    return "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-500";
  }
  switch (status) {
    case "open":
      return "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400";
    case "scheduled":
      return "border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-400";
    case "closed":
      return "border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "draft":
      return "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-warning-400";
    default:
      return "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400";
  }
}

export default function FormHomePage() {
  const t = useTranslations("form");
  const tbuilder = useTranslations("form.builder");
  const locale = (useLocale() === "en" ? "en" : "th") as FormLocale;
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const [listData, setListData] = useState<FormListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [busyType, setBusyType] = useState<FormType | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadForms = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const ws = await api.get<EventWorkspace>(
        `/event/workspace?locale=${encodeURIComponent(locale)}`,
      );
      const res = await api.get<FormListResponse>(
        `/event/forms?eventId=${encodeURIComponent(ws.eventId)}`,
      );
      setListData(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("loadError");
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsLoading(false);
    }
  }, [locale, t, user]);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const handleToggleStatus = async (record: FormRecord) => {
    const nextStatus = record.status === "draft" ? "scheduled" : "draft";
    setBusyType(record.type);
    setFeedback(null);
    try {
      await api.patch<FormRecord>(`/event/forms/${record.id}/status`, {
        status: nextStatus,
        opensAt: record.opensAt,
        closesAt: record.closesAt,
      });
      await loadForms();
      setFeedback({
        type: "success",
        message:
          nextStatus === "scheduled"
            ? tbuilder("scheduleSuccess")
            : tbuilder("revertSuccess"),
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : tbuilder("saveError");
      setFeedback({ type: "error", message: msg });
    } finally {
      setBusyType(null);
    }
  };

  const handleDelete = async (record: FormRecord) => {
    const ok = await confirm({
      title: t("deleteConfirmTitle"),
      message: t("deleteConfirmMessage"),
      confirmLabel: t("delete"),
      variant: "danger",
    });
    if (!ok) return;

    setBusyType(record.type);
    setFeedback(null);
    try {
      await api.delete<void>(`/event/forms/${record.id}`);
      await loadForms();
      setFeedback({ type: "success", message: t("deleteSuccess") });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : tbuilder("saveError");
      setFeedback({ type: "error", message: msg });
    } finally {
      setBusyType(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white/90">
          {t("title")}
        </h1>
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-300"
              : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircleIcon className="h-5 w-5 shrink-0" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("loading")}
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:gap-4">
            {FORM_TYPES.map((type) => {
              const isEnabled =
                listData === null
                  ? true
                  : type === "registration"
                    ? listData.hasRegistration
                    : listData.hasSurvey;
              const record = listData?.forms.find((f) => f.type === type);
              const isBusy = busyType === type;
              const localizedTitle =
                record?.head[locale]?.title?.trim() ||
                record?.head.th.title?.trim() ||
                t(type);

              const statusLabel = !isEnabled
                ? t("status.disabled")
                : record
                  ? t(`status.${record.status}`)
                  : t("status.notCreated");

              return (
                <div
                  key={type}
                  className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-lg bg-brand-50 p-2 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                      <DocumentTextIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-gray-800 dark:text-white/90">
                          {localizedTitle}
                        </h3>
                        <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                          ({t(type)})
                        </span>
                      </div>
                      {record && (record.opensAt || record.closesAt) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" />
                          {record.opensAt && (
                            <span>
                              {tbuilder("opensAt")}:{" "}
                              {new Date(record.opensAt).toLocaleString(locale)}
                            </span>
                          )}
                          {record.closesAt && (
                            <span>
                              {tbuilder("closesAt")}:{" "}
                              {new Date(record.closesAt).toLocaleString(locale)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                        record?.status,
                        isEnabled,
                      )}`}
                    >
                      {statusLabel}
                    </span>

                    {record && record.canChangeStatus && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleToggleStatus(record)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        <span>
                          {record.status === "draft"
                            ? tbuilder("schedule")
                            : tbuilder("revertToDraft")}
                        </span>
                      </button>
                    )}

                    {record && record.canDelete && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDelete(record)}
                        title={t("delete")}
                        aria-label={t("delete")}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition-colors hover:border-error-200 hover:bg-error-50 hover:text-error-600 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-error-500/15 dark:hover:text-error-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}

                    {isEnabled && (
                      <Link
                        href={`/form/${type}`}
                        className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-300 dark:hover:bg-brand-500/25"
                      >
                        {record ? t("edit") : t("create")}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
