import { denyUnlessAdmin } from "@/core/auth/api-guard";
import { getBoundAdminOverview } from "@/services/admin/overview";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const denied = denyUnlessAdmin(request);
  if (denied) return denied;

  try {
    const data = await getBoundAdminOverview();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load overview";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
