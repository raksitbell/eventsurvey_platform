import AuthGuard from "@/components/auth/AuthGuard";
import ParticipantEventPreviewPanel from "@/components/event/participant/ParticipantEventPreviewPanel";
import { normalizeContentLocale } from "@/core/event/content";

interface ParticipantPreviewPageProps {
  searchParams: Promise<{
    device?: string | string[];
    from?: string | string[];
    lang?: string | string[];
  }>;
}
export default async function ParticipantPreviewPage({
  searchParams,
}: ParticipantPreviewPageProps) {
  const { device, from, lang } = await searchParams;
  return (
    <AuthGuard area="event">
      <ParticipantEventPreviewPanel
        origin={from === "publish" ? "publish" : "branding"}
        device={device === "mobile" ? "mobile" : "desktop"}
        requestedLocale={normalizeContentLocale(lang)}
      />
    </AuthGuard>
  );
}
