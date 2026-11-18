import type { NextRequest } from "next/server";
import { analyticsFailure } from "@/core/analytics/http";
import { AnalyticsError } from "@/core/analytics/policy";
import { csvReport, printReport } from "@/core/analytics/report";
import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { getAnalytics } from "@/services/event/analytics";

export async function POST(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;

  const format = request.nextUrl.searchParams.get("format");
  if (format !== "csv" && format !== "pdf") {
    return analyticsFailure(new AnalyticsError(400, "INVALID_FORMAT"));
  }
  try {
    const data = await getAnalytics(
      request,
      session,
      `analytics.export.${format}`,
    );
    return authJson({
      content: format === "csv" ? csvReport(data) : printReport(data),
      mime:
        format === "csv" ? "text/csv;charset=utf-8" : "text/html;charset=utf-8",
      filename: `responses-${data.filters.locale}-${data.filters.raw ? "raw" : "masked"}.${
        format === "csv" ? "csv" : "html"
      }`,
    });
  } catch (error) {
    return analyticsFailure(error);
  }
}
