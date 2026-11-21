import type { NextRequest } from "next/server";
import { ServiceError } from "@/core/api/service-error";
import {
  denyUnlessEventPermission,
  isAuthSession,
  requireEventSession,
} from "@/core/auth/api-guard";
import { isInspectingEvent } from "@/core/auth/cookie";
import { authJson, readJsonObject } from "@/core/auth/route-response";
import { eventSetupMediaIdPattern } from "@/core/event/setup-media-url";
import { setupMediaKindSchema } from "@/core/event/setup-state";
import { readSetupState } from "@/core/event/setup-storage";
import {
  getSetupMediaUploadEvent,
  requireDiskUploadDirectory,
  storeEventSetupMedia,
} from "@/services/event/setup-media";
import {
  createBlobMediaUpload,
  finalizeBlobMediaUpload,
  usesBlobMedia,
} from "@/services/event/setup-media-blob";
import { IMAGE_MAX_INPUT_BYTES } from "@/utils/image-upload";

export const runtime = "nodejs";

async function handleMediaUpload(eventId: string, request: NextRequest) {
  const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const blob = usesBlobMedia();
  if (mediaType === "multipart/form-data" && !blob) {
    return authJson(await storeEventSetupMedia(eventId, request), 201);
  }
  const body = await readJsonObject(request);
  const kind = setupMediaKindSchema.safeParse(body?.kind);
  if (!body || !kind.success || typeof body.contentType !== "string") {
    return authJson({ error: "INVALID_SETUP_MEDIA" }, 400);
  }
  if (body.eventId !== eventId) {
    return authJson({ error: "SETUP_EVENT_CHANGED" }, 409);
  }
  if (body.action === "prepare") {
    if (typeof body.size !== "number" || !Number.isSafeInteger(body.size) || body.size < 1) {
      return authJson({ error: "INVALID_SETUP_MEDIA" }, 400);
    }
    if (body.size >= IMAGE_MAX_INPUT_BYTES) {
      return authJson({ error: "SETUP_MEDIA_TOO_LARGE" }, 413);
    }
    if (!blob) {
      requireDiskUploadDirectory();
      return authJson({ mode: "disk" });
    }
    const upload = await createBlobMediaUpload(eventId, kind.data, body.contentType);
    return authJson({ mode: "blob", ...upload });
  }
  if (
    blob && body.action === "complete" &&
    typeof body.id === "string" && eventSetupMediaIdPattern.test(body.id)
  ) {
    const asset = await finalizeBlobMediaUpload(eventId, kind.data, body.contentType, body.id);
    return authJson(asset, 201);
  }
  return authJson({ error: "INVALID_SETUP_MEDIA" }, 400);
}

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

    return await handleMediaUpload(event.id, request);
  } catch (error) {
    if (error instanceof ServiceError) return authJson({ error: error.code }, error.status);
    return authJson({ error: "SETUP_MEDIA_STORAGE_UNAVAILABLE" }, 503);
  }
}
