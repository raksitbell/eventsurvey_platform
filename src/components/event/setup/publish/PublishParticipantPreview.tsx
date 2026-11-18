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
    <section className="publish-card publish-preview">
      <h2 className="font-semibold">{t("displayPreview")}</h2>
      <SetupDisplayPreview {...data} compact />
      <Link
        className="publish-preview__link"
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
