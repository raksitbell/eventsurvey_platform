import ParticipantEventScreen from "@/components/event/participant/ParticipantEventScreen";
import { routing } from "@/i18n/routing";
import { getPublicEventBySlug } from "@/services/event/public-event";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

interface PublicEventPageProps {
  searchParams: Promise<{ lang?: string | string[] }>;
  params: Promise<{ locale: string; eventSlug: string }>;
}

export default async function PublicEventPage({
  params, searchParams,
}: PublicEventPageProps) {
  const { locale, eventSlug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const event = await getPublicEventBySlug(eventSlug, locale, (await searchParams).lang);
  if (!event) notFound();

  const { draft, branding, bannerUrl, formLinks } = event;
  return (
    <ParticipantEventScreen
      contentLocale={event.contentLocale}
      draft={draft}
      branding={branding}
      bannerUrl={bannerUrl}
      formLinks={formLinks}
    />
  );
}
