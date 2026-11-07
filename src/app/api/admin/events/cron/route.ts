import {
  isAuthSession,
  requireAdminSession,
} from "@/core/auth/api-guard";
import { ServiceError } from "@/core/api/service-error";
import { runEventLifecycleCron } from "@/services/admin/events";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/events/cron
 * Opens scheduled events past start_at and closes open events past end_at.
 * Also closes forms whose closes_at has passed.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdminSession(request);
  if (!isAuthSession(denied)) return denied;

  try {
    const data = await runEventLifecycleCron(denied.userId);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Failed to run event lifecycle cron" },
      { status: 502 },
    );
  }
}
