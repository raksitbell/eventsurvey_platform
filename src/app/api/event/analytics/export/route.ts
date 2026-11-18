import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
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
    const t = await getTranslations({
      locale: data.filters.locale,
      namespace: "eventReports.analyticsExport",
    });
    const columns = {
      responseId: t("responseId"),
      form: t("form"),
      submittedAt: t("submittedAt"),
    };
    const content =
      format === "csv"
        ? csvReport(data, columns)
        : printReport(data, {
            ...columns,
            title: t("title"),
            print: t("print"),
            range: t("range"),
            all: t("all"),
            masked: t("masked"),
            raw: t("raw"),
            total: t("total"),
            empty: t("empty"),
          });
    return authJson({
      content,
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
