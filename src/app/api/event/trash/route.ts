import { NextRequest } from "next/server";
import { eventRoute } from "@/core/event/route-context";
import { restoreTrash } from "@/services/event/reporting";
export function POST(request: NextRequest) {
  return eventRoute(request, async (id, locale) =>
    restoreTrash(id, locale, (await request.json()).id),
  );
}
