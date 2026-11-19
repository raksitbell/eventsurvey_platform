import type { NextRequest } from "next/server";
import { ServiceError } from "@/core/api/service-error";
import {
  denyUnlessEventPermission,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { isInspectingEvent } from "@/core/auth/cookie";
import { authJson } from "@/core/auth/route-response";
import { readSetupState } from "@/core/event/setup-storage";
import { getSetupMediaUploadEvent, storeEventSetupMedia } from "@/services/event/setup-media";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await requireEventSession(request);
  if (!isAuthSession(session)) return session;

  try {
    const event = await getSetupMediaUploadEvent(session.userId, {
      inspectedEventId: isInspectingEvent(session)
        ? session.inspectedEventId
        : null,
    });
    if (!event) return authJson({ error: "EVENT_NOT_FOUND" }, 404);
    const denied = await denyUnlessEventPermission(
      session.userId,
      "manage_event",
      event.id,
      session,
    );
    if (denied) return denied;
    if (event.status !== "draft" || readSetupState(event).publication) {
      return authJson({ error: "SETUP_READ_ONLY" }, 409);
    }

    return authJson(await storeEventSetupMedia(event.id, request), 201);
  } catch (error) {
    if (error instanceof ServiceError) return authJson({ error: error.code }, error.status);
    return authJson({ error: "SETUP_MEDIA_STORAGE_UNAVAILABLE" }, 503);
  }
}
