import { getBoundAdminOverview } from "@/services/admin/overview";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await getBoundAdminOverview();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load overview";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
