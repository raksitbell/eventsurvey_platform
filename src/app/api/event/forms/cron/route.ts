import { requireCronSecret } from "@/core/auth/cron";
import { ServiceError } from "@/core/api/service-error";
import { runFormsCron } from "@/services/event/forms";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/event/forms/cron
 *
 * Persist time-based transitions:
 * - scheduled → open  (when opens_at / event window reached)
 * - scheduled|open → closed (when closes_at reached or event closed)
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` or `x-cron-secret: $CRON_SECRET`
 */
export async function POST(request: NextRequest) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  try {
    const data = await runFormsCron();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Forms cron failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
