import { NextRequest } from "next/server";
import { eventRoute } from "@/core/event/route-context";
import { getReportingData } from "@/services/event/reporting";
export function GET(request: NextRequest) {
  return eventRoute(request, getReportingData);
}
