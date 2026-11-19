import type { NextRequest } from "next/server";
import { eventRoute } from "@/core/event/route-context";
import { listEventActivity } from "@/services/event/activity";

function parseIso(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function GET(request: NextRequest) {
  return eventRoute(request, async (userId, locale, _body, options) => {
    const params = request.nextUrl.searchParams;
    return listEventActivity(
      userId,
      locale,
      {
        startDate: parseIso(params.get("startDate")),
        endDate: parseIso(params.get("endDate")),
        actorUserId: params.get("actorUserId") || null,
      },
      { inspectedEventId: options?.inspectedEventId },
    );
  });
}
