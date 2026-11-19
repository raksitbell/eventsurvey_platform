import type { NextRequest } from "next/server";
import { eventRoute } from "@/core/event/route-context";
import { publishDashboard } from "@/services/event/dashboard";

export function POST(request: NextRequest) {
  return eventRoute(request, (userId, locale, body, options) =>
    publishDashboard(userId, locale, body?.widgets, options),
  );
}
