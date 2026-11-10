"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
interface ParticipantFooterProps {
  readOnly?: boolean;
}
export default function ParticipantFooter({
  readOnly = false,
}: ParticipantFooterProps) {
  const t = useTranslations("participantEvent");
  return (
    <footer className="flex min-h-20 shrink-0 flex-col items-center justify-center gap-2 bg-(--participant-secondary) px-4 py-3 text-theme-sm text-(--participant-on-secondary) @4xl/participant:min-h-18 @4xl/participant:flex-row @4xl/participant:justify-between @4xl/participant:px-8 dark:bg-(--participant-secondary) dark:text-(--participant-on-secondary)">
      <p className="order-2 @4xl/participant:order-none">
        <span className="@4xl/participant:hidden">© EventSurvey 2026</span>
        <span className="hidden @4xl/participant:inline">© EventSurvey</span>
      </p>
      <div className="flex w-full flex-wrap items-center justify-between gap-4 @4xl/participant:w-136 @4xl/participant:gap-0">
        <span className="text-(--participant-on-secondary) dark:text-(--participant-on-secondary)">
          {t("privacy")}
        </span>
        {readOnly ? (
          <span className="inline-flex items-center gap-1 text-(--participant-on-secondary) @4xl/participant:w-60 dark:text-(--participant-on-secondary)">
            <>
              {t("adminLogin")}
              <ArrowRightIcon
                className="size-4 rtl:rotate-180"
                aria-hidden="true"
              />
            </>
          </span>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-(--participant-on-secondary) hover:underline @4xl/participant:w-60 dark:text-(--participant-on-secondary)"
          >
            <>
              {t("adminLogin")}
              <ArrowRightIcon
                className="size-4 rtl:rotate-180"
                aria-hidden="true"
              />
            </>
          </Link>
        )}
      </div>
    </footer>
  );
}
