import PublicParticipantForm from "@/components/event/participant/forms/PublicParticipantForm";
import { publicEventPath } from "@/core/event/public-event-paths";
import { getPublicFormBySlug } from "@/services/event/public-event";
import type { ParticipantFormKind } from "@/types/event/participant";
import { notFound } from "next/navigation";

interface PublicParticipantFormPageProps {
  eventSlug: string;
  kind: ParticipantFormKind;
}

export default async function PublicParticipantFormPage({
  eventSlug,
  kind,
}: PublicParticipantFormPageProps) {
  const result = await getPublicFormBySlug(eventSlug, kind);
  if (!result) notFound();

  async function checkAvailability() {
    "use server";

    const current = await getPublicFormBySlug(eventSlug, kind);
    return current?.status ?? "unavailable";
  }

  return (
    <PublicParticipantForm
      kind={kind}
      eventHref={publicEventPath(eventSlug)}
      result={result}
      checkAvailability={checkAvailability}
    />
  );
}
