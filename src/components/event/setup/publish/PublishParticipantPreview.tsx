"use client";
import SetupDisplayPreview from "@/components/event/participant/SetupDisplayPreview";
import { Link } from "@/i18n/navigation";
import type { ParticipantEventData } from "@/types/event/participant";
import { useTranslations } from "next-intl";
export default function PublishParticipantPreview({
  onOpen,
  ...data
}: ParticipantEventData & { onOpen: () => boolean }) {
  const t = useTranslations("eventSetup");
  return (
    <section className="min-w-0 space-y-3 rounded-xl border border-event-border p-4 dark:border-gray-700">
      <h2 className="font-semibold">{t("displayPreview")}</h2>
      <div className="mx-auto max-h-150 max-w-sm overflow-auto rounded-xl">
        <SetupDisplayPreview {...data} compact />
      </div>
      <Link
        className="inline-block text-sm text-event-action underline dark:text-brand-300"
        href="/preview/event?from=publish"
        onClick={(event) => {
          if (!onOpen()) event.preventDefault();
        }}
      >
        {t("fullscreen")}
      </Link>
    </section>
  );
}
