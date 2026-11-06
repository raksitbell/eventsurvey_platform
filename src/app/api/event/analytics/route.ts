import { NextRequest, NextResponse } from "next/server";
import { getAnalytics } from "@/services/event/analytics";
import { analyticsFailure } from "@/core/analytics/http";
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await getAnalytics(request), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return analyticsFailure(error);
  }
}
