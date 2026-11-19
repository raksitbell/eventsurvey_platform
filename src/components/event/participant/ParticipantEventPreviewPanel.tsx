"use client";

import BrandingPreviewGallery from "@/components/event/setup/branding/BrandingPreviewGallery";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import {
  getEventContent,
  normalizeContentLocale,
  resolveEventTranslation,
} from "@/core/event/content";
import {
  participantPreviewHref,
  participantPreviewReturnHref,
  participantPreviewSelection,
} from "@/core/event/participant";
import useEventBranding from "@/hooks/useEventBranding";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import type {
  ParticipantPreviewOrigin,
  ParticipantPreviewSelection,
} from "@/types/event/participant";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import ParticipantDisplayPreview from "./ParticipantDisplayPreview";
import ParticipantPreviewLanguage from "./ParticipantPreviewLanguage";
import ParticipantPreviewToolbar from "./ParticipantPreviewToolbar";
import ParticipantFormPreviewSkeleton from "./forms/ParticipantFormPreviewSkeleton";

interface LoadedParticipantPreviewProps {
  workspace: EventWorkspace;
  userId: string;
  locale: string;
  origin: ParticipantPreviewOrigin;
  requestedLocale: string | null;
  selection: ParticipantPreviewSelection;
}

function LoadedParticipantPreview({
  workspace,
  userId,
  locale,
  origin,
  requestedLocale,
  selection,
}: LoadedParticipantPreviewProps) {
  const { branding } = useEventBranding(workspace, userId, locale);
  const content = getEventContent(workspace, locale);
  const translation = resolveEventTranslation(content, requestedLocale);
  const contentLocale =
    workspace.content || requestedLocale ? translation.localeCode : null;

  function updateView(
    language: string | null,
    next: ParticipantPreviewSelection,
  ) {
    globalThis.history.replaceState(
      null,
      "",
      participantPreviewHref(origin, language, next),
    );
  }

  return (
    <BrandingPreviewGallery
      workspace={workspace}
      draft={workspace}
      branding={branding}
      bannerUrl={workspace.bannerUrl}
      contentLocale={contentLocale}
      className="flex-1"
      selectionState={[selection, (next) => updateView(contentLocale, next)]}
      pageHeader={(tabs) => (
        <ParticipantPreviewToolbar
          returnHref={participantPreviewReturnHref(
            origin,
            contentLocale,
            selection,
          )}
          languageControl={
            content.translations.length > 1 && (
              <ParticipantPreviewLanguage
                content={content}
                value={translation.localeCode}
                onChange={(value) => updateView(value, selection)}
              />
            )
          }
        >
          {tabs}
        </ParticipantPreviewToolbar>
      )}
    >
      <ParticipantDisplayPreview
        fillViewport
        draft={workspace}
        branding={branding}
        bannerUrl={workspace.bannerUrl}
        contentLocale={contentLocale}
      />
    </BrandingPreviewGallery>
  );
}

export default function ParticipantEventPreviewPanel({
  origin,
}: {
  origin: ParticipantPreviewOrigin;
}) {
  const t = useTranslations("eventHome");
  const search = useSearchParams();
  const langs = search.getAll("lang");
  const requestedLocale =
    langs.length === 1 ? normalizeContentLocale(langs[0]) : null;
  const selection = participantPreviewSelection(
    search.getAll("tab"),
    search.getAll("form"),
  );
  const { workspace, error, loading, retry, identity, userId, locale } =
    useEventWorkspace();

  return (
    <main className="flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-gray-950">
      {!loading && !error && workspace && userId ? (
        <LoadedParticipantPreview
          key={identity}
          workspace={workspace}
          userId={userId}
          locale={locale}
          origin={origin}
          requestedLocale={requestedLocale}
          selection={selection}
        />
      ) : (
        <>
          <ParticipantPreviewToolbar
            returnHref={participantPreviewReturnHref(
              origin,
              requestedLocale,
              selection,
            )}
          />
          {loading ? (
            <div className="min-h-0 flex-1 overflow-auto">
              {selection.tab === "form" ? (
                <ParticipantFormPreviewSkeleton label={t("loading")} />
              ) : (
                <div
                  role="status"
                  aria-label={t("loading")}
                  aria-busy="true"
                  className="space-y-6 p-6"
                >
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-96 w-full" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-6">
              <p role="status" className="text-gray-700 dark:text-gray-300">
                {t(error ? "loadError" : "noEvent")}
              </p>
              {error && <Button onClick={retry}>{t("retry")}</Button>}
            </div>
          )}
        </>
      )}
    </main>
  );
}
