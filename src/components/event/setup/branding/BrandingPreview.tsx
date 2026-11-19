"use client";

import ParticipantPreviewLanguage from "@/components/event/participant/ParticipantPreviewLanguage";
import ParticipantDisplayPreview from "@/components/event/participant/ParticipantDisplayPreview";
import { bannerLayouts } from "@/core/event/banner-layout";
import { afterSaved } from "@/core/event/draft";
import { participantPreviewHref } from "@/core/event/participant";
import useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import { Link, useRouter } from "@/i18n/navigation";
import type { ParticipantEventData } from "@/types/event/participant";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import BrandingInterfacePreviews from "./BrandingInterfacePreviews";

interface BrandingPreviewProps extends ParticipantEventData {
  workspace: EventWorkspace;
  onOpen: () => boolean | Promise<boolean>;
}
export default function BrandingPreview({
  workspace,
  onOpen,
  ...data
}: BrandingPreviewProps) {
  const t = useTranslations("eventBranding");
  const setup = useTranslations("eventSetup");
  const router = useRouter();
  const layout = data.branding.layout ?? "portrait";
  const { content, translation, contentLocale, selectLanguage } =
    useParticipantPreviewLanguage(data.draft);
  const href = participantPreviewHref("branding", contentLocale);
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
      <div
        tabIndex={0}
        role="region"
        aria-label={t("preview")}
        className="custom-scrollbar max-h-[70dvh] space-y-4 overflow-y-auto rounded-xl"
      >
        <h3 className="text-sm font-semibold">{setup("displayPreview")}</h3>
        <div className="relative overflow-hidden rounded-xl bg-participant-page p-3 dark:bg-gray-950">
          <div
            inert
            className={
              layout === "landscape" ? "mx-auto max-w-4xl" : "mx-auto max-w-md"
            }
          >
            <ParticipantDisplayPreview
              {...data}
              contentLocale={contentLocale ?? undefined}
            />
          </div>
          <Link
            href={href}
            onNavigate={(event) => {
              event.preventDefault();
              void afterSaved(onOpen, () => router.push(href));
            }}
            aria-label={t("fullPreview")}
            className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action"
          />
        </div>
        <BrandingInterfacePreviews
          {...data}
          workspace={workspace}
          contentLocale={contentLocale}
        />
      </div>
    </section>
  );
}
