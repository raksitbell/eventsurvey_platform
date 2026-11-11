"use client";

import ParticipantPreviewViewport from "@/components/event/participant/ParticipantPreviewViewport";
import { Link } from "@/i18n/navigation";
import type {
  ParticipantEventData,
  ParticipantDevice,
} from "@/types/event/participant";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface BrandingPreviewProps extends ParticipantEventData {
  onOpen: () => boolean;
}
export default function BrandingPreview({
  onOpen,
  ...data
}: BrandingPreviewProps) {
  const t = useTranslations("eventBranding");
  const [device, setDevice] = useState<ParticipantDevice>("desktop");
  return (
    <section className="min-w-0 space-y-4 p-6 lg:border-s lg:border-event-border dark:lg:border-gray-700">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
        {t("preview")}
      </h2>
      <div role="group" aria-label={t("previewMode")} className="flex gap-2">
        {(["desktop", "mobile"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={device === mode}
            onClick={() => setDevice(mode)}
            className={`rounded-lg px-5 py-2 text-theme-xs font-medium ${device === mode ? "bg-event-action text-white dark:bg-event-action" : "bg-event-tile text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
          >
            {t(mode)}
          </button>
        ))}
      </div>
      <div className="relative overflow-hidden rounded-xl bg-participant-page p-3 dark:bg-gray-950">
        <div
          inert
          className={
            device === "mobile" ? "mx-auto max-w-60" : "mx-auto max-w-md"
          }
        >
          <ParticipantPreviewViewport {...data} device={device} />
        </div>
        <Link
          href={`/preview/event?device=${device}`}
          onClick={(event) => {
            if (!onOpen()) event.preventDefault();
          }}
          aria-label={t("fullPreview")}
          className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action"
        />
      </div>
    </section>
  );
}
