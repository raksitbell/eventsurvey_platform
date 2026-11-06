import { NextResponse } from "next/server";
import { clearVerifiedSession } from "@/core/auth/verified-session";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearVerifiedSession(response);
  return response;
}
