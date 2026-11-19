import { isAuthSession, requireEventSession } from "@/core/auth/api-guard";
import { authJson } from "@/core/auth/route-response";
import { setupDraftPatch } from "@/core/event/setup-request";
import { getSetupContext, readSetupState, saveSetupDraft } from "@/services/event/setup";
import { setupErrorResponse } from "@/services/event/setup-response";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;
  try {
    const context = await getSetupContext(session.userId);
    const requestedEvent = request.nextUrl.searchParams.get("eventId");
    if (requestedEvent && requestedEvent !== context.event.id)
      return authJson({ error: "SETUP_EVENT_CHANGED" }, 409);
    const setup = readSetupState(context.event);
    if (!context.workspace.canEditEvent && !setup.publication)
      return authJson({ error: "FORBIDDEN" }, 403);
    return authJson(setup);
  } catch (error) {
    return setupErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;
  const input = setupDraftPatch.safeParse(await request.json().catch(() => null));
  if (!input.success) return authJson({ error: "INVALID_SETUP" }, 400);
  try {
    const context = await getSetupContext(session.userId);
    if (input.data.eventId !== context.event.id)
      return authJson({ error: "SETUP_EVENT_CHANGED" }, 409);
    return authJson(await saveSetupDraft(context, input.data));
  } catch (error) {
    return setupErrorResponse(error);
  }
}
