import AuthGuard from "@/components/auth/AuthGuard";
import ParticipantEventPreviewPanel from "@/components/event/participant/ParticipantEventPreviewPanel";
import { normalizeContentLocale } from "@/core/event/content";

interface ParticipantPreviewPageProps {
  searchParams: Promise<{
    from?: string | string[];
    lang?: string | string[];
  }>;
}
export default async function ParticipantPreviewPage({
  searchParams,
}: ParticipantPreviewPageProps) {
  const { from, lang } = await searchParams;
  return (
    <AuthGuard area="event">
      <ParticipantEventPreviewPanel
        origin={from === "publish" ? "publish" : "branding"}
        requestedLocale={normalizeContentLocale(lang)}
      />
    </AuthGuard>
  );
}
