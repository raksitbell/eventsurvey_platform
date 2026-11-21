import { NextRequest } from "next/server";
import { eventRoute } from "@/core/event/route-context";
import { getReportingData } from "@/services/event/reporting";
export function GET(request: NextRequest) {
  const purpose =
    request.nextUrl.searchParams.get("view") === "responses"
      ? "responses"
      : undefined;
  const formId = purpose ? request.nextUrl.searchParams.get("formId") : null;
  const eventId = request.nextUrl.searchParams.get("eventId");
  return eventRoute(request, (userId, locale, body, options) =>
    getReportingData(userId, locale, body, {
      ...options,
      purpose,
      formId,
      eventId,
    }),
  );
}
