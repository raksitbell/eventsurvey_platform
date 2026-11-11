"use client";
import { setupFormStatus } from "@/core/event/form-summary";
import type { FormStatus, FormType } from "@/types/event/form";
import { useTranslations } from "next-intl";

interface SetupFormCardProps {
  type: FormType;
  enabled: boolean;
  count: number;
  status?: FormStatus;
}
export default function SetupFormCard({
  type,
  enabled,
  count,
  status,
}: SetupFormCardProps) {
  const t = useTranslations("eventForms");
  return (
    <section
      className={`flex min-h-83 min-w-0 flex-col gap-4.5 rounded-xl border border-event-tile bg-white p-6 dark:border-gray-700 dark:bg-gray-900 ${enabled ? "" : "opacity-50"}`}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-picker-heading font-semibold text-gray-900 dark:text-gray-100">
          {t(type)}
        </h2>
        <span className="shrink-0 rounded-full bg-event-subtle px-2.5 py-1 text-picker-small text-event-action dark:bg-gray-800 dark:text-gray-300">
          {t(enabled ? "enabled" : "disabled")}
        </span>
      </header>
      <div className="flex items-center gap-2">
        <p className="text-title-md font-bold text-event-action dark:text-brand-400">
          {String(count).padStart(2, "0")}
        </p>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t("questions")}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 text-theme-xs text-gray-500 dark:text-gray-400">
        <span>{t("formStatus")}</span>
        <span className="rounded-full bg-event-subtle px-3 py-1 text-event-action dark:bg-gray-800 dark:text-brand-400">
          {t(setupFormStatus(status))}
        </span>
      </div>
      <div className="mt-auto">
        <button
          type="button"
          disabled
          className="h-11 w-full cursor-not-allowed rounded-preview-control bg-event-action px-4 text-theme-sm font-semibold text-white opacity-50 dark:bg-event-action"
        >
          {t("openBuilder")}
        </button>
      </div>
    </section>
  );
}
