import { getBoundAdminUsers } from "@/services/admin/users";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get("role") ?? undefined;
    const data = await getBoundAdminUsers(role);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
