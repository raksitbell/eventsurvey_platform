import { NextRequest, NextResponse } from "next/server";
import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import { getAssignedShareLinks } from "@/services/event/public-event";

export async function GET(request: NextRequest) {
  const session = requireEventSession(request);
  if (!isAuthSession(session)) return session;
  if (session.role !== "event_owner") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  try {
    const share = await getAssignedShareLinks(session.userId);
    return NextResponse.json(share, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const status =
      error instanceof ServiceError && error.status === 403 ? 403 : 502;
    return NextResponse.json(
      { error: status === 403 ? "FORBIDDEN" : "SHARE_LINKS_UNAVAILABLE" },
      { status },
    );
  }
}
