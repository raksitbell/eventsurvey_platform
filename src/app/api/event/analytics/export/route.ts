import { NextRequest, NextResponse } from "next/server";
import { getAnalytics } from "@/services/event/analytics";
import { analyticsFailure } from "@/core/analytics/http";
import { AnalyticsError } from "@/core/analytics/policy";
import { csvReport, printReport } from "@/core/analytics/report";
export async function POST(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format");
  if (format !== "csv" && format !== "pdf")
    return analyticsFailure(new AnalyticsError(400, "INVALID_FORMAT"));
  let data;
  try {
    data = await getAnalytics(request, `analytics.export.${format}`);
  } catch (error) {
    return analyticsFailure(error);
  }
  return NextResponse.json(
    {
      content: format === "csv" ? csvReport(data) : printReport(data),
      mime:
        format === "csv"
          ? "text/csv;charset=utf-8"
          : "text/html;charset=utf-8",
      filename: `responses-${data.filters.locale}-${data.filters.raw ? "raw" : "masked"}.${format === "csv" ? "csv" : "html"}`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
