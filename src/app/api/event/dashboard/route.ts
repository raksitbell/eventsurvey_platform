import { NextRequest } from "next/server";
import { eventRoute } from "@/core/event/route-context";
import { publishDashboard } from "@/services/event/dashboard";
export function POST(request: NextRequest) {
  return eventRoute(request, async (id, locale) =>
    publishDashboard(id, locale, (await request.json()).widgets),
  );
}
