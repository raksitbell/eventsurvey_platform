"use client";

import SetupPreviewGallery from "@/components/event/setup/branding/SetupPreviewGallery";
import type { EventWorkspace } from "@/types/event/workspace";
import ParticipantPreviewLanguage from "@/components/event/participant/ParticipantPreviewLanguage";
import ParticipantDisplayPreview from "@/components/event/participant/ParticipantDisplayPreview";
import type useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import type { ParticipantEventData } from "@/types/event/participant";
import { useTranslations } from "next-intl";

interface PublishParticipantPreviewProps extends ParticipantEventData {
  workspace: EventWorkspace;
  language: ReturnType<typeof useParticipantPreviewLanguage>;
  onOpen: () => boolean | Promise<boolean>;
  disabled?: boolean;
}

export default function PublishParticipantPreview({
  workspace,
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
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-event-border bg-white p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{brandingText("preview")}</h2>
        {languageControl}
      </div>
      <SetupPreviewGallery
        {...data}
        workspace={workspace}
        origin="publish"
        label={t("fullscreen")}
        onOpen={onOpen}
        disabled={disabled}
        contentLocale={contentLocale}
        className="min-h-0 w-full"
        viewportClassName="sm:max-h-[min(68dvh,50rem)]"
      >
        <div className={data.branding.layout === "landscape" ? "mx-auto max-w-5xl" : "mx-auto max-w-md"}>
          <ParticipantDisplayPreview {...data} contentLocale={contentLocale} />
        </div>
      </SetupPreviewGallery>
    </section>
  );
}
