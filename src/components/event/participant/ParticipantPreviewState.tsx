"use client";

import ParticipantPreviewToolbar from "@/components/event/participant/ParticipantPreviewToolbar";
import type { ParticipantPreviewOrigin } from "@/types/event/participant";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface ParticipantPreviewStateProps {
  origin?: ParticipantPreviewOrigin;
  contentLocale?: string | null;
  languageControl?: ReactNode;
  children: ReactNode;
}
export default function ParticipantPreviewState({
  origin = "branding",
  contentLocale,
  languageControl,
  children,
}: ParticipantPreviewStateProps) {
  const t = useTranslations("eventPreview");
  return (
    <div
      className="@container/preview mx-auto flex h-dvh w-full max-w-participant-desktop flex-col overflow-hidden bg-white dark:bg-gray-950"
    >
      <ParticipantPreviewToolbar
        origin={origin}
        contentLocale={contentLocale}
      />
      {languageControl && (
        <div className="flex shrink-0 justify-end border-b border-preview-border bg-preview-page px-3 py-1.5 @xl/preview:px-6 dark:border-gray-700 dark:bg-gray-900">
          {languageControl}
        </div>
      )}
      <div
        role="region"
        aria-label={t("viewport")}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto bg-white -outline-offset-2 dark:bg-gray-950"
      >
        {children}
      </div>
    </div>
  );
}
