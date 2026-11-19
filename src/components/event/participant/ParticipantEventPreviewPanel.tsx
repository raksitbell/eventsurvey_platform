"use client";

import BrandingPreviewGallery from "@/components/event/setup/branding/BrandingPreviewGallery";
import ParticipantDisplayPreview from "@/components/event/participant/ParticipantDisplayPreview";
import ParticipantPreviewLanguage from "@/components/event/participant/ParticipantPreviewLanguage";
import ParticipantPreviewState from "@/components/event/participant/ParticipantPreviewState";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import { getEventContent, resolveEventTranslation } from "@/core/event/content";
import {
  participantPreviewHref,
  participantPreviewReturnHref,
} from "@/core/event/participant";
import useEventBranding from "@/hooks/useEventBranding";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { Link, useRouter } from "@/i18n/navigation";
import type { ParticipantPreviewOrigin } from "@/types/event/participant";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ParticipantEventPreviewPanelProps {
  origin?: ParticipantPreviewOrigin;
  requestedLocale?: string | null;
}
interface LoadedParticipantPreviewProps {
  workspace: EventWorkspace;
  userId: string;
  locale: string;
  contentLocale?: string | null;
}
function LoadedParticipantPreview({
  workspace,
  userId,
  locale,
  contentLocale,
}: LoadedParticipantPreviewProps) {
  const { branding } = useEventBranding(workspace, userId, locale);
  return (
    <BrandingPreviewGallery
      workspace={workspace}
      draft={workspace}
      branding={branding}
      bannerUrl={workspace.bannerUrl}
      contentLocale={contentLocale}
      className="mx-auto min-h-0 w-full max-w-5xl flex-1"
      viewportClassName="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6"
    >
      <div className={branding.layout === "landscape" ? "mx-auto max-w-5xl" : "mx-auto max-w-lg"}>
        <ParticipantDisplayPreview
          draft={workspace}
          branding={branding}
          bannerUrl={workspace.bannerUrl}
          contentLocale={contentLocale}
        />
      </div>
    </BrandingPreviewGallery>
  );
}
export default function ParticipantEventPreviewPanel({
  origin = "branding",
  requestedLocale = null,
}: ParticipantEventPreviewPanelProps) {
  const t = useTranslations("eventHome");
  const router = useRouter();
  const preview = useTranslations("eventPreview");
  const { workspace, error, loading, retry, identity, userId, locale } =
    useEventWorkspace();
  const [selection, setSelection] = useState<{
    prior: string | null;
    value: string;
  } | null>(null);
  const eventContent = workspace ? getEventContent(workspace, locale) : null;
  const selectedLocale =
    selection?.prior === requestedLocale ? selection.value : requestedLocale;
  const translation = eventContent
    ? resolveEventTranslation(eventContent, selectedLocale)
    : null;
  const contentLocale =
    workspace?.content || selectedLocale ? translation?.localeCode : null;
  const changeLanguage = (value: string) => {
    setSelection({ prior: requestedLocale, value });
    router.replace(participantPreviewHref(origin, value), {
      scroll: false,
    });
  };
  let content;
  if (loading)
    content = (
      <div
        role="status"
        aria-label={t("loading")}
        aria-busy="true"
        className="space-y-6 p-6"
      >
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  else if (error || !workspace || !userId)
    content = (
      <div className="space-y-4 p-6">
        <p role="status" className="text-gray-700 dark:text-gray-300">
          {t(error ? "loadError" : "noEvent")}
        </p>
        {error && <Button onClick={retry}>{t("retry")}</Button>}
        <Link
          href={participantPreviewReturnHref(origin, requestedLocale)}
          className="block text-event-action dark:text-brand-400"
        >
          {preview("back")}
        </Link>
      </div>
    );
  else
    content = (
      <LoadedParticipantPreview
        key={identity}
        workspace={workspace}
        userId={userId}
        locale={locale}
        contentLocale={contentLocale}
      />
    );
  return (
    <ParticipantPreviewState
      origin={origin}
      contentLocale={contentLocale ?? requestedLocale}
      languageControl={
        !loading &&
        !error &&
        eventContent &&
        eventContent.translations.length > 1 &&
        translation ? (
          <ParticipantPreviewLanguage
            content={eventContent}
            value={translation.localeCode}
            onChange={changeLanguage}
          />
        ) : undefined
      }
    >
      {content}
    </ParticipantPreviewState>
  );
}
