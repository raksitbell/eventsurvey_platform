import type { NextRequest } from "next/server";
import { eventRoute } from "@/core/event/route-context";
import { getReportExport } from "@/services/event/report-export";

export function GET(request: NextRequest) {
  return eventRoute(request, async (userId, locale, _, options) => {
    const report = await getReportExport(
      userId,
      locale,
      request.nextUrl.searchParams,
      options?.inspectedEventId,
    );
    if (!("filename" in report)) return report;
    return new Response(report.content, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8",
        "Content-Disposition": `attachment; filename="${report.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
