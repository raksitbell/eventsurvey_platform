"use client";

import ParticipantPreviewLanguage from "@/components/event/participant/ParticipantPreviewLanguage";
import ParticipantDisplayPreview from "@/components/event/participant/ParticipantDisplayPreview";
import { bannerLayouts } from "@/core/event/banner-layout";
import useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import type { ParticipantEventData } from "@/types/event/participant";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import SetupPreviewGallery from "./SetupPreviewGallery";

interface BrandingPreviewProps extends ParticipantEventData {
  workspace: EventWorkspace;
  onOpen: () => boolean | Promise<boolean>;
  disabled?: boolean;
}
export default function BrandingPreview({
  workspace,
  onOpen,
  disabled,
  ...data
}: BrandingPreviewProps) {
  const t = useTranslations("eventBranding");
  const setup = useTranslations("eventSetup");
  const layout = data.branding.layout ?? "portrait";
  const { content, translation, contentLocale, selectLanguage } =
    useParticipantPreviewLanguage(data.draft);
  return (
    <section className="min-w-0 space-y-4 p-6 lg:border-s lg:border-event-border dark:lg:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">
          {t("preview")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-portal-label text-gray-600 dark:text-gray-300">
            {setup("bannerRatio")} {bannerLayouts[layout].ratio}
          </p>
          {content.translations.length > 1 && (
            <ParticipantPreviewLanguage
              content={content}
              value={translation.localeCode}
              onChange={selectLanguage}
            />
          )}
        </div>
      </div>
      <SetupPreviewGallery
        {...data}
        origin="branding"
        label={t("fullPreview")}
        onOpen={onOpen}
        openFromDisplay
        disabled={disabled}
        workspace={workspace}
        contentLocale={contentLocale}
        viewportClassName="max-h-[65dvh]"
      >
        <div className="overflow-hidden rounded-xl bg-participant-page p-3 dark:bg-gray-950">
          <div
            className={
              layout === "landscape" ? "mx-auto max-w-4xl" : "mx-auto max-w-md"
            }
          >
            <ParticipantDisplayPreview
              {...data}
              contentLocale={contentLocale ?? undefined}
            />
          </div>
        </div>
      </SetupPreviewGallery>
    </section>
  );
}
