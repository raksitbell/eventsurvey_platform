import type { NextRequest } from "next/server";
import { clearAuthSessionCookie } from "@/core/auth/cookie";
import { authJson, rejectCrossOrigin } from "@/core/auth/route-response";

export function POST(request: NextRequest) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const response = authJson({ ok: true });
  clearAuthSessionCookie(response);
  return response;
}
