import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { MockApiError, mockApi } from "@/core/api/mock-client";
import { ServiceError } from "@/core/api/service-error";
import {
  eventSetupMediaIdPattern,
  eventSetupMediaUrl,
  isEventSetupMediaUrl,
} from "@/core/event/setup-media-url";
import { isActiveMockUser } from "@/core/mock/map-user";
import type { MockEvent, MockUser } from "@/types/mock";
import { IMAGE_MAX_INPUT_BYTES } from "@/utils/image-upload";

export { isEventSetupMediaUrl } from "@/core/event/setup-media-url";

const supportedTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
] as const;
type MediaContentType = (typeof supportedTypes)[number];

type MediaMetadata = {
  eventId: string;
  type: MediaContentType;
  size: number;
};

export type EventSetupMedia = MediaMetadata & { id: string };
const maxFormBytes = IMAGE_MAX_INPUT_BYTES + 64 * 1024;

function isSupportedType(type: unknown): type is MediaContentType {
  return typeof type === "string" && supportedTypes.some((entry) => entry === type);
}

function mediaDirectory() {
  const path = process.env.EVENT_SETUP_MEDIA_DIR;
  if (path) return isAbsolute(path) ? path : null;
  return process.env.NODE_ENV === "development"
    ? join(process.cwd(), ".eventsurvey-media")
    : null;
}

function isMissingFile(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function matchesImageType(bytes: Buffer, type: MediaContentType) {
  const tag = (start: number, size: number) =>
    bytes.toString("latin1", start, start + size);

  if (bytes.length < 16) return false;

  switch (type) {
    case "image/png":
      return tag(0, 8) === "\x89PNG\r\n\x1a\n" && tag(12, 4) === "IHDR";
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      return tag(0, 4) === "RIFF" && tag(8, 4) === "WEBP";
    case "image/avif": {
      const size = bytes.readUInt32BE(0);
      if (tag(4, 4) !== "ftyp" || size < 16 || size > bytes.length) return false;
      if (tag(8, 4) === "avif" || tag(8, 4) === "avis") return true;
      for (let offset = 16; offset + 4 <= size; offset += 4) {
        const brand = tag(offset, 4);
        if (brand === "avif" || brand === "avis") return true;
      }
      return false;
    }
    case "image/gif":
      return tag(0, 6) === "GIF87a" || tag(0, 6) === "GIF89a";
    case "image/bmp":
      return tag(0, 2) === "BM";
  }
}

async function readUploadBytes(request: Request) {
  if (Number(request.headers.get("content-length")) > maxFormBytes) {
    throw new ServiceError("SETUP_MEDIA_TOO_LARGE", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError("INVALID_SETUP_MEDIA", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxFormBytes) {
        void reader.cancel().catch(() => undefined);
        throw new ServiceError("SETUP_MEDIA_TOO_LARGE", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Uint8Array(Buffer.concat(chunks, size));
}

async function readUpload(request: Request, eventId: string) {
  const contentType = request.headers.get("content-type");
  if (contentType?.split(";")[0]?.trim().toLowerCase() !== "multipart/form-data") {
    throw new ServiceError("INVALID_SETUP_MEDIA", 400);
  }
  const body = await readUploadBytes(request);
  const form = await new Response(body, { headers: { "Content-Type": contentType } })
    .formData()
    .catch(() => null);
  if (!form) throw new ServiceError("INVALID_SETUP_MEDIA", 400);
  const expectedIds = form.getAll("eventId");
  if (expectedIds.length !== 1 || expectedIds[0] !== eventId) {
    throw new ServiceError("SETUP_EVENT_CHANGED", 409);
  }
  const files = form.getAll("file");
  const [file] = files;
  if (files.length !== 1 || !(file instanceof File)) {
    throw new ServiceError("INVALID_SETUP_MEDIA", 400);
  }
  if (file.size < 1) throw new ServiceError("INVALID_SETUP_MEDIA", 400);
  if (file.size >= IMAGE_MAX_INPUT_BYTES) {
    throw new ServiceError("SETUP_MEDIA_TOO_LARGE", 413);
  }
  const type = file.type.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isSupportedType(type) || !matchesImageType(bytes, type)) {
    throw new ServiceError("UNSUPPORTED_SETUP_MEDIA", 415);
  }
  return { type, bytes };
}

export async function getSetupMediaEvent(eventId: string) {
  if (!eventId || eventId === "." || eventId === "..") return null;
  try {
    const event = await mockApi.get<MockEvent>("/events/" + encodeURIComponent(eventId));
    return event?.id === eventId && !event.deleted_at ? event : null;
  } catch (error) {
    if (error instanceof MockApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getSetupMediaUploadEvent(
  userId: string,
  options: { inspectedEventId?: string | null } = {},
) {
  const inspectedEventId = options.inspectedEventId?.trim() || null;
  if (inspectedEventId) {
    const user = await mockApi.get<MockUser>(
      "/users/" + encodeURIComponent(userId),
    );
    if (
      user?.id !== userId ||
      !isActiveMockUser(user) ||
      user.system_role !== "platform_admin"
    ) {
      return null;
    }
    return getSetupMediaEvent(inspectedEventId);
  }

  const user = await mockApi.get<MockUser>("/users/" + encodeURIComponent(userId));
  if (user?.id !== userId || !isActiveMockUser(user) || !user.event_id) {
    return null;
  }
  return getSetupMediaEvent(user.event_id);
}

export async function storeEventSetupMedia(eventId: string, request: Request) {
  const dir = mediaDirectory();
  if (!dir) throw new ServiceError("SETUP_MEDIA_STORAGE_UNAVAILABLE", 503);
  const { type, bytes } = await readUpload(request, eventId);
  const id = randomUUID();
  const metadata: MediaMetadata = { eventId, type, size: bytes.length };

  let temporary: string | undefined;
  try {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    temporary = await mkdtemp(join(dir, ".upload-"));
    await writeFile(join(temporary, "data"), bytes, { mode: 0o600 });
    await writeFile(join(temporary, "metadata.json"), JSON.stringify(metadata), {
      mode: 0o600,
    });
    await rename(temporary, join(dir, id));
    temporary = undefined;
    return { url: eventSetupMediaUrl(id) };
  } catch {
    if (temporary) await rm(temporary, { recursive: true, force: true }).catch(() => undefined);
    throw new ServiceError("SETUP_MEDIA_STORAGE_UNAVAILABLE", 503);
  }
}

export async function findEventSetupMedia(id: string): Promise<EventSetupMedia | null> {
  const dir = mediaDirectory();
  if (!dir || !eventSetupMediaIdPattern.test(id)) return null;
  try {
    const metadata = JSON.parse(
      await readFile(join(dir, id, "metadata.json"), "utf8"),
    ) as Partial<MediaMetadata> | null;
    if (
      !metadata ||
      typeof metadata.eventId !== "string" ||
      !metadata.eventId ||
      !isSupportedType(metadata.type) ||
      typeof metadata.size !== "number" ||
      !Number.isSafeInteger(metadata.size) ||
      metadata.size < 1 ||
      metadata.size >= IMAGE_MAX_INPUT_BYTES
    ) {
      return null;
    }
    return { id, eventId: metadata.eventId, type: metadata.type, size: metadata.size };
  } catch (error) {
    if (isMissingFile(error) || error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function readEventSetupMedia(asset: EventSetupMedia) {
  const dir = mediaDirectory();
  if (!dir || !eventSetupMediaIdPattern.test(asset.id)) return null;
  try {
    const bytes = await readFile(join(dir, asset.id, "data"));
    return bytes.length === asset.size && matchesImageType(bytes, asset.type)
      ? new Uint8Array(bytes)
      : null;
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

export async function assertEventSetupMedia(eventId: string, urls: Iterable<string>) {
  for (const url of new Set(urls)) {
    if (!isEventSetupMediaUrl(url)) throw new ServiceError("INVALID_SETUP_MEDIA", 400);
    const asset = await findEventSetupMedia(url.slice(url.lastIndexOf("/") + 1));
    if (!asset || asset.eventId !== eventId || !(await readEventSetupMedia(asset))) {
      throw new ServiceError("SETUP_MEDIA_UNAVAILABLE", 409);
    }
  }
}
