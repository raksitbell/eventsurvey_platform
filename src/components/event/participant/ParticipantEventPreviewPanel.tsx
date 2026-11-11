"use client";

import ParticipantPreviewViewport from "@/components/event/participant/ParticipantPreviewViewport";
import ParticipantPreviewState from "@/components/event/participant/ParticipantPreviewState";
import Button from "@/components/ui/button/Button";
import Skeleton from "@/components/ui/skeleton/Skeleton";
import useEventBranding from "@/hooks/useEventBranding";
import useEventWorkspace from "@/hooks/useEventWorkspace";
import { Link } from "@/i18n/navigation";
import type { ParticipantDevice } from "@/types/event/participant";
import type { EventWorkspace } from "@/types/event/workspace";
import { useTranslations } from "next-intl";
interface ParticipantEventPreviewPanelProps {
  device: ParticipantDevice;
  origin?: "branding" | "publish";
}
interface LoadedParticipantPreviewProps extends ParticipantEventPreviewPanelProps {
  workspace: EventWorkspace;
  userId: string;
  locale: string;
}
function LoadedParticipantPreview({
  workspace,
  userId,
  locale,
  device,
}: LoadedParticipantPreviewProps) {
  const { branding } = useEventBranding(workspace, userId, locale);
  return (
    <ParticipantPreviewViewport
      draft={workspace}
      branding={branding}
      bannerUrl={workspace.bannerUrl}
      device={device}
      fitContent
      readOnly
    />
  );
}
export default function ParticipantEventPreviewPanel({
  device,
  origin = "branding",
}: ParticipantEventPreviewPanelProps) {
  const t = useTranslations("eventHome");
  const { workspace, error, loading, retry, identity, userId, locale } =
    useEventWorkspace();
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
          href="/event/branding"
          className="block text-event-action dark:text-brand-400"
        >
          {t("details.steps.branding")}
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
        device={device}
      />
    );
  return (
    <ParticipantPreviewState device={device} origin={origin}>
      {content}
    </ParticipantPreviewState>
  );
}
