import { NextResponse } from "next/server";
import { AnalyticsError } from "@/core/analytics/policy";
export function analyticsFailure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof AnalyticsError
          ? error.message
          : "ANALYTICS_UNAVAILABLE",
    },
    {
      status: error instanceof AnalyticsError ? error.status : 502,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
