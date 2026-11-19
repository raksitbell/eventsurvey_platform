import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { setupPublishRequest } from "@/core/event/setup-request";
import { getSetupContext, publishSetup } from "@/services/event/setup";
import { setupErrorResponse } from "@/services/event/setup-response";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;
  const input = setupPublishRequest.safeParse(await request.json().catch(() => null));
  if (!input.success) return authJson({ error: "INVALID_SETUP" }, 400);
  try {
    const context = await getSetupContext(session.userId, input.data.locale);
    if (input.data.eventId !== context.event.id)
      return authJson({ error: "SETUP_EVENT_CHANGED" }, 409);
    return authJson(await publishSetup(context, input.data));
  } catch (error) {
    return setupErrorResponse(error);
  }
}
