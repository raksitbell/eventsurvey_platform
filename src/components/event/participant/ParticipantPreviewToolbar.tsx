"use client";

import { Link } from "@/i18n/navigation";
import type { ParticipantDevice } from "@/types/event/participant";
import {
  ChevronLeftIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface ParticipantPreviewToolbarProps {
  device: ParticipantDevice;
  origin?: "branding" | "publish";
}
export default function ParticipantPreviewToolbar({
  device,
  origin = "branding",
}: ParticipantPreviewToolbarProps) {
  const t = useTranslations("eventPreview");
  const nextDevice = device === "desktop" ? "mobile" : "desktop";
  const DeviceIcon =
    nextDevice === "mobile" ? DevicePhoneMobileIcon : ComputerDesktopIcon;
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-preview-border bg-preview-page px-3 py-1.5 @xl/preview:px-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex min-w-0 shrink-0 items-center gap-2 text-participant-text dark:text-gray-100">
        <EyeIcon
          className="size-4.5 shrink-0 @xl/preview:size-5.5"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-0.75">
          <p className="text-preview-control font-bold @xl/preview:hidden">
            {t("titleCompact")}
          </p>
          <p className="hidden text-preview-title font-bold @xl/preview:block">
            {t("title")}
          </p>
          <p className="hidden text-theme-xs leading-tight text-participant-muted @xl/preview:block dark:text-gray-400">
            {t("description")}
          </p>
        </div>
      </div>
      <nav
        aria-label={t("titleCompact")}
        className="flex shrink-0 items-center justify-end gap-2"
      >
        <Link
          href={`/preview/event?device=${nextDevice}${origin === "publish" ? "&from=publish" : ""}`}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-preview-control border border-preview-border bg-preview-page px-2.25 text-preview-compact font-semibold text-participant-text @xl/preview:px-3.5 @xl/preview:text-preview-control dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <DeviceIcon className="size-4.5" aria-hidden="true" />
          {t(nextDevice)}
        </Link>
        <Link
          href={origin === "publish" ? "/event/publish" : "/event/branding"}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-preview-control border border-preview-border bg-white px-2.25 text-preview-compact font-semibold text-participant-text @xl/preview:px-3.5 @xl/preview:text-preview-control dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          <ChevronLeftIcon
            className="size-4.5 rtl:rotate-180"
            aria-hidden="true"
          />
          <span className="@xl/preview:hidden">{t("backCompact")}</span>
          <span className="hidden @xl/preview:inline">{t("back")}</span>
        </Link>
      </nav>
    </header>
  );
}
