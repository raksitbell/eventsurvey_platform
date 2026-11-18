import ParticipantEventScreen from "@/components/event/participant/ParticipantEventScreen";
import { routing } from "@/i18n/routing";
import { getPublicEventBySlug } from "@/services/event/public-event";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

interface PublicEventPageProps {
  params: Promise<{ locale: string; eventSlug: string }>;
}

export default async function PublicEventPage({
  params,
}: PublicEventPageProps) {
  const { locale, eventSlug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const event = await getPublicEventBySlug(eventSlug, locale);
  if (!event) notFound();

  const { draft, branding, bannerUrl, formLinks } = event;
  return (
    <ParticipantEventScreen
      draft={draft}
      branding={branding}
      bannerUrl={bannerUrl}
      formLinks={formLinks}
    />
  );
}
