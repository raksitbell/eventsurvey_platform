"use client";

import SetupPreviewGallery from "@/components/event/setup/branding/SetupPreviewGallery";
import type useEventFormSummaries from "@/hooks/useEventFormSummaries";
import type { EventWorkspace } from "@/types/event/workspace";
import ParticipantPreviewLanguage from "@/components/event/participant/ParticipantPreviewLanguage";
import ParticipantDisplayPreview from "@/components/event/participant/ParticipantDisplayPreview";
import type useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import type { ParticipantEventData } from "@/types/event/participant";
import { useTranslations } from "next-intl";

interface PublishParticipantPreviewProps extends ParticipantEventData {
  workspace: EventWorkspace;
  formState?: ReturnType<typeof useEventFormSummaries>;
  language: ReturnType<typeof useParticipantPreviewLanguage>;
  onOpen: () => boolean | Promise<boolean>;
  disabled?: boolean;
}

export default function PublishParticipantPreview({
  workspace,
  formState,
  language,
  onOpen,
  disabled,
  ...data
}: PublishParticipantPreviewProps) {
  const t = useTranslations("eventSetup");
  const brandingText = useTranslations("eventBranding");
  const { content, translation, contentLocale, selectLanguage } = language;
  const languageControl = content.translations.length > 1 && (
    <ParticipantPreviewLanguage
      content={content}
      value={translation.localeCode}
      onChange={selectLanguage}
    />
  );

  return (
    <section className="publish-card publish-preview">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{brandingText("preview")}</h2>
        {languageControl}
      </div>
      <SetupPreviewGallery
        {...data}
        workspace={workspace}
        formState={formState}
        origin="publish"
        label={t("fullscreen")}
        onOpen={onOpen}
        disabled={disabled}
        contentLocale={contentLocale}
        className="min-h-0 w-full"
        viewportClassName="publish-preview-gallery__viewport"
      >
        <div className={data.branding.layout === "landscape" ? "mx-auto max-w-5xl" : "mx-auto max-w-md"}>
          <ParticipantDisplayPreview {...data} contentLocale={contentLocale} />
        </div>
      </SetupPreviewGallery>
    </section>
  );
}
