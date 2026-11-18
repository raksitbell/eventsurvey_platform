"use client";

import ParticipantPreviewLanguage from "@/components/event/participant/ParticipantPreviewLanguage";
import ParticipantPreviewViewport from "@/components/event/participant/ParticipantPreviewViewport";
import { participantPreviewHref } from "@/core/event/participant";
import useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import { Link } from "@/i18n/navigation";
import type { ParticipantEventData } from "@/types/event/participant";
import { useTranslations } from "next-intl";
export default function PublishParticipantPreview({
  onOpen,
  ...data
}: ParticipantEventData & { onOpen: () => boolean }) {
  const t = useTranslations("eventSetup");
  const { content, translation, contentLocale, selectLanguage } =
    useParticipantPreviewLanguage(data.draft);
  return (
    <section className="publish-card publish-preview">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("displayPreview")}</h2>
        {content.translations.length > 1 && (
          <ParticipantPreviewLanguage
            content={content}
            value={translation.localeCode}
            onChange={selectLanguage}
          />
        )}
      </div>
      <div className="w-full max-w-md overflow-hidden rounded-preview-control">
        <ParticipantPreviewViewport
          {...data}
          device="desktop"
          contentLocale={contentLocale}
          readOnly
        />
      </div>
      <Link
        className="publish-preview__link"
        href={participantPreviewHref("desktop", "publish", contentLocale)}
        onClick={(event) => {
          if (!onOpen()) event.preventDefault();
        }}
      >
        {t("fullscreen")}
      </Link>
    </section>
  );
}
