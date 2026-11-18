import type { NextRequest } from "next/server";
import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { ServiceError } from "@/core/api/service-error";
import { eventQrPng } from "@/core/event/share-qr";
import { getAssignedShareLinks } from "@/services/event/public-event";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;
  if (session.role !== "event_owner") {
    return authJson({ error: "FORBIDDEN" }, 403);
  }

  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "registration" && kind !== "survey") {
    return authJson({ error: "INVALID_FORM_KIND" }, 400);
  }

  try {
    const url = (await getAssignedShareLinks(session.userId))?.links[kind];
    if (!url) return authJson({ error: "QR_UNAVAILABLE" }, 404);

    const headers = new Headers({
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
    });
    if (request.nextUrl.searchParams.get("download") === "1") {
      headers.set(
        "Content-Disposition",
        `attachment; filename="eventsurvey-${kind}-qr.png"`,
      );
    }
    const png = await eventQrPng(url);
    return new Response(new Uint8Array(png), { headers });
  } catch (error) {
    const status =
      error instanceof ServiceError && error.status === 403 ? 403 : 502;
    return authJson(
      { error: status === 403 ? "FORBIDDEN" : "QR_UNAVAILABLE" },
      status,
    );
  }
}
