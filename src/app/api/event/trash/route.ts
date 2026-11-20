import type { NextRequest } from "next/server";
import { eventRoute } from "@/core/event/route-context";
import { restoreTrash } from "@/services/event/reporting";

export function POST(request: NextRequest) {
  return eventRoute(request, (userId, locale, body, options) =>
    restoreTrash(userId, locale, body?.id, options),
  );
}
