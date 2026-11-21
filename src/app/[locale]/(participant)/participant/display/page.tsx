import ParticipantEventScreen from "@/components/event/participant/ParticipantEventScreen";
import EventDisplayViewport from "@/components/participant/EventDisplayViewport";
import { routing } from "@/i18n/routing";
import { getPublicEventBySlug } from "@/services/event/public-event";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

interface ParticipantDisplayPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string | string[]; lang?: string | string[] }>;
}

export default async function ParticipantDisplayPage({ params, searchParams }: ParticipantDisplayPageProps) {
  const [{ locale }, { event: slug, lang }] = await Promise.all([params, searchParams]);
  if (!hasLocale(routing.locales, locale) || typeof slug !== "string") notFound();
  const event = await getPublicEventBySlug(slug, locale, lang, true);
  if (!event) notFound();
  return (
    <EventDisplayViewport layout={event.branding.layout ?? "portrait"}>
      <ParticipantEventScreen {...event} displayOnly />
    </EventDisplayViewport>
  );
}
