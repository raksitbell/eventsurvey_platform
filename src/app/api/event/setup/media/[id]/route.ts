import type { NextRequest } from "next/server";
import {
  denyUnlessEventPermission,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { eventSetupMediaUrl } from "@/core/event/setup-media-url";
import { readSetupRecord } from "@/core/event/setup-storage";
import {
  findEventSetupMedia,
  getSetupMediaEvent,
  readEventSetupMedia,
} from "@/services/event/setup-media";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const notFound = () => authJson({ error: "SETUP_MEDIA_NOT_FOUND" }, 404);
  try {
    const { id } = await params;
    const asset = await findEventSetupMedia(id);
    if (!asset) return notFound();
    const event = await getSetupMediaEvent(asset.eventId);
    if (!event) return notFound();

    const { publication, publishedBranding } = readSetupRecord(event);
    const url = eventSetupMediaUrl(id);
    const published =
      (event.status === "scheduled" || event.status === "open" || event.status === "closed") &&
      publication !== null &&
      [publication.branding, ...Object.values(publishedBranding ?? {})]
        .some(({ logo, wordmark, banner }) =>
          [logo?.url, wordmark?.url, banner?.url].includes(url),
        );
    if (!published) {
      const session = await requireEventSession(request);
      if (!isAuthSession(session)) return notFound();
      const denied = await denyUnlessEventPermission(
        session.userId,
        "manage_event",
        event.id,
      );
      if (denied) return notFound();
    }

    const bytes = await readEventSetupMedia(asset);
    if (!bytes) return notFound();
    return new Response(bytes, {
      headers: {
        "Content-Type": asset.type,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
