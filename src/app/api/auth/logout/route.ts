import type { NextRequest } from "next/server";
import { acceptsJson, authJson } from "@/core/auth/route-response";
import { clearVerifiedSession } from "@/core/auth/verified-session";

export function POST(request: NextRequest) {
  if (!acceptsJson(request)) return authJson({ error: "INVALID_REQUEST" }, 400);
  const response = authJson({ ok: true });
  clearVerifiedSession(response);
  return response;
}
