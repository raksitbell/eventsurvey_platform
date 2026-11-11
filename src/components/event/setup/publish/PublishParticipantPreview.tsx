"use client";
import ParticipantPreviewViewport from "@/components/event/participant/ParticipantPreviewViewport";
import { Link } from "@/i18n/navigation";
import type {
  ParticipantEventData,
  ParticipantDevice,
} from "@/types/event/participant";
import { useTranslations } from "next-intl";
import { useState } from "react";
interface PublishParticipantPreviewProps extends ParticipantEventData {
  onOpen: () => boolean;
}
export default function PublishParticipantPreview({
  onOpen,
  ...data
}: PublishParticipantPreviewProps) {
  const t = useTranslations("eventPublish");
  const [device, setDevice] = useState<ParticipantDevice>("desktop");
  return (
    <section className="space-y-3">
      <div
        className="flex flex-wrap items-center gap-3"
        role="group"
        aria-label={t("previewMode")}
      >
        {(["desktop", "mobile"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={device === mode}
            onClick={() => setDevice(mode)}
            className={`h-11 rounded-preview-control border px-6 text-theme-sm font-semibold ${device === mode ? "border-event-action bg-event-action text-white dark:bg-event-action" : "border-preview-border bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"}`}
          >
            {t(mode)}
          </button>
        ))}
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t("previewHint")}
        </p>
      </div>
      <div className="rounded-2xl border border-event-border bg-white p-3 sm:px-5 sm:py-4 dark:border-gray-700 dark:bg-gray-900">
        <div
          className={`relative mx-auto overflow-hidden rounded-xl border border-event-border dark:border-gray-700 ${device === "mobile" ? "max-w-participant-mobile" : "w-full"}`}
        >
          <div inert>
            <ParticipantPreviewViewport {...data} device={device} readOnly />
          </div>
          <Link
            href={`/preview/event?device=${device}&from=publish`}
            onClick={(event) => {
              if (!onOpen()) event.preventDefault();
            }}
            aria-label={t("fullPreview")}
            className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action"
          />
        </div>
      </div>
    </section>
  );
}
