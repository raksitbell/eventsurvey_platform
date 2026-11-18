import { NextRequest, NextResponse } from "next/server";
import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import { eventQrPng } from "@/core/event/share-qr";
import { getAssignedShareLinks } from "@/services/event/public-event";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = requireEventSession(request);
  if (!isAuthSession(session)) return session;
  if (session.role !== "event_owner") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "registration" && kind !== "survey") {
    return NextResponse.json({ error: "INVALID_FORM_KIND" }, { status: 400 });
  }

  try {
    const url = (await getAssignedShareLinks(session.userId))?.links[kind];
    if (!url)
      return NextResponse.json({ error: "QR_UNAVAILABLE" }, { status: 404 });

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
    return NextResponse.json(
      { error: status === 403 ? "FORBIDDEN" : "QR_UNAVAILABLE" },
      { status },
    );
  }
}
