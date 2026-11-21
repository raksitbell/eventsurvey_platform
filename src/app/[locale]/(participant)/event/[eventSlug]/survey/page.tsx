import PublicParticipantFormPage from "@/components/event/participant/forms/PublicParticipantFormPage";

export default async function SurveyPage({
  params, searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  return <PublicParticipantFormPage requestedLanguage={(await searchParams).lang} eventSlug={eventSlug} kind="survey" />;
}
