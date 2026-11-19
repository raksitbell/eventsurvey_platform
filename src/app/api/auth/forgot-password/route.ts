import { authJson, rejectCrossOrigin } from "@/core/auth/route-response";
import { forgotPasswordBodySchema } from "@/core/validation/forgot-password";
import { formatZodError } from "@/core/validation/setup-password";
import { requestPasswordReset } from "@/services/auth/forgot-password";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return authJson({ error: "INVALID_JSON" }, 400);
  }

  const parsed = forgotPasswordBodySchema.safeParse(json);
  if (!parsed.success) {
    return authJson(formatZodError(parsed.error), 400);
  }

  await requestPasswordReset(parsed.data.email);
  return authJson({ ok: true });
}
