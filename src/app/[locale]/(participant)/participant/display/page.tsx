import EventDisplayViewport from "@/components/participant/EventDisplayViewport";
import type { EventDisplayLayout } from "@/types/participant/display";
import { getTranslations } from "next-intl/server";

interface ParticipantDisplayPageProps {
  searchParams: Promise<{ layout?: string | string[] }>;
}

export default async function ParticipantDisplayPage({ searchParams }: ParticipantDisplayPageProps) {
  const { layout: rawLayout } = await searchParams;
  const layout: EventDisplayLayout = rawLayout === "square" || rawLayout === "landscape" ? rawLayout : "portrait";
  const t = await getTranslations("participantDisplay");

  return (
    <EventDisplayViewport
      layout={layout}
      data={{
        title: t("title"), organizer: t("organizer"), organizerInitial: t("organizerInitial"),
        startsAt: t("startsAt"), endsAt: t("endsAt"), location: t("location"),
        locationDetail: t("locationDetail"), description: t("description"), socialHandle: t("socialHandle"),
      }}
      labels={{
        hostedBy: t("hostedBy"), hostedBySubtitle: t("hostedBySubtitle"),
        about: t("about"), aboutSubtitle: t("aboutSubtitle"), registration: t("registration"),
        survey: t("survey"), bannerPlaceholder: t("bannerPlaceholder"), qrPlaceholder: t("qrPlaceholder"),
      }}
    />
  );
}
