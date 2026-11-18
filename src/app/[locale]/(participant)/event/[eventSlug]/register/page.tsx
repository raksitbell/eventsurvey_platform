import PublicParticipantFormPage from "@/components/event/participant/forms/PublicParticipantFormPage";

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  return (
    <PublicParticipantFormPage eventSlug={eventSlug} kind="registration" />
  );
}
