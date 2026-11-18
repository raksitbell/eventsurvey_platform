"use client";
import ParticipantPreviewViewport from "@/components/event/participant/ParticipantPreviewViewport";
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
      <div className="w-full max-w-md overflow-hidden rounded-preview-control">
        <ParticipantPreviewViewport {...data} device="desktop" readOnly />
      </div>
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
