import AuthGuard from "@/components/auth/AuthGuard";
import ParticipantEventPreviewPanel from "@/components/event/participant/ParticipantEventPreviewPanel";

interface ParticipantPreviewPageProps {
  searchParams: Promise<{ device?: string; from?: string }>;
}
export default async function ParticipantPreviewPage({
  searchParams,
}: ParticipantPreviewPageProps) {
  const { device, from } = await searchParams;
  return (
    <AuthGuard area="event">
      <ParticipantEventPreviewPanel
        origin={from === "publish" ? "publish" : "branding"}
        device={device === "mobile" ? "mobile" : "desktop"}
      />
    </AuthGuard>
  );
}
