import { NextResponse } from "next/server";
import { AnalyticsError } from "@/core/analytics/policy";
import { VerifiedSessionError } from "@/core/auth/verified-session";

export function analyticsFailure(error: unknown) {
  const domainError =
    error instanceof AnalyticsError || error instanceof VerifiedSessionError;
  return NextResponse.json(
    { error: domainError ? error.message : "ANALYTICS_UNAVAILABLE" },
    {
      status: domainError ? error.status : 502,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
