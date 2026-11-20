import AuthGuard from "@/components/auth/AuthGuard";
import ParticipantEventPreviewPanel from "@/components/event/participant/ParticipantEventPreviewPanel";

interface ParticipantPreviewPageProps {
  searchParams: Promise<{
    from?: string | string[];
  }>;
}
export default async function ParticipantPreviewPage({
  searchParams,
}: ParticipantPreviewPageProps) {
  const { from } = await searchParams;
  return (
    <AuthGuard area="event">
      <ParticipantEventPreviewPanel
        origin={from === "publish" ? "publish" : "branding"}
      />
    </AuthGuard>
  );
}
