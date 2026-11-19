import PublicParticipantForm from "@/components/event/participant/forms/PublicParticipantForm";
import { publicEventPath } from "@/core/event/public-event-paths";
import {
  getPublicFormBySlug,
  getPublicFormPageBySlug,
} from "@/services/event/public-event";
import type { ParticipantFormKind } from "@/types/event/participant";
import { getLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";

interface PublicParticipantFormPageProps {
  eventSlug: string;
  kind: ParticipantFormKind;
}

export default async function PublicParticipantFormPage({
  eventSlug,
  kind,
}: PublicParticipantFormPageProps) {
  const locale = await getLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const page = await getPublicFormPageBySlug(eventSlug, kind, locale);
  if (!page) notFound();

  async function checkAvailability() {
    "use server";

    const current = await getPublicFormBySlug(eventSlug, kind);
    return current?.status ?? "unavailable";
  }

  return (
    <PublicParticipantForm
      kind={kind}
      eventHref={publicEventPath(eventSlug)}
      {...page}
      checkAvailability={checkAvailability}
    />
  );
}
