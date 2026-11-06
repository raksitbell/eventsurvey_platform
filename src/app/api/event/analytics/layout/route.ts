import { NextRequest, NextResponse } from "next/server";
import { saveAnalyticsLayout } from "@/services/event/analytics";
import { analyticsFailure } from "@/core/analytics/http";
export async function PATCH(request: NextRequest) {
  try {
    return NextResponse.json(await saveAnalyticsLayout(request));
  } catch (error) {
    return analyticsFailure(error);
  }
}
