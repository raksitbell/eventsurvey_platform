import { randomUUID } from "node:crypto";
import { BlobNotFoundError, get, head, issueSignedToken, presignUrl, put, setTtl } from "@vercel/blob";
import { ServiceError } from "@/core/api/service-error";
import { eventSetupMediaIdPattern, eventSetupMediaUrl } from "@/core/event/setup-media-url";
import type { EventSetupMediaKind } from "@/types/event/setup";
import { IMAGE_MAX_INPUT_BYTES } from "@/utils/image-upload";
import { isSupportedType, matchesImageType, type MediaContentType } from "./setup-media-image";

type BlobMediaManifest = {
  eventId: string;
  kind: EventSetupMediaKind;
  type: MediaContentType;
  size: number;
};

const privateRead = {
  access: "private",
  useCache: false,
  headers: { "Accept-Encoding": "identity" },
} as const;

export function usesBlobMedia() {
  const provider = process.env.EVENT_SETUP_MEDIA_PROVIDER;
  if (provider) return provider === "blob";
  return process.env.VERCEL === "1" && Boolean(process.env.BLOB_STORE_ID);
}

function isMediaKind(kind: unknown): kind is EventSetupMediaKind {
  return kind === "logo" || kind === "wordmark" || kind === "banner";
}

function mediaPath(eventId: string, kind: EventSetupMediaKind, contentType: MediaContentType, id: string) {
  if (!eventId || !eventSetupMediaIdPattern.test(id) || !isMediaKind(kind)) {
    throw new ServiceError("INVALID_SETUP_MEDIA", 400);
  }
  const eventKey = Buffer.from(eventId, "utf8").toString("base64url");
  return `event-setup/media/${eventKey}/${kind}/${id}.${contentType.slice("image/".length)}`;
}

function manifestPath(id: string) {
  return `event-setup/metadata/${id}.json`;
}

export async function createBlobMediaUpload(eventId: string, kind: EventSetupMediaKind, contentType: string) {
  if (!isSupportedType(contentType)) throw new ServiceError("UNSUPPORTED_SETUP_MEDIA", 415);
  const id = randomUUID();
  const pathname = mediaPath(eventId, kind, contentType, id);
  const constraints = {
    pathname,
    allowedContentTypes: [contentType],
    maximumSizeInBytes: IMAGE_MAX_INPUT_BYTES - 1,
    validUntil: Date.now() + 10 * 60_000,
  };
  const token = await issueSignedToken({ ...constraints, operations: ["put"] });
  const { presignedUrl } = await presignUrl(token, {
    ...constraints,
    operation: "put",
    access: "private",
    allowOverwrite: false,
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
    ttlDays: 1,
  });
  return { id, uploadUrl: presignedUrl };
}

export async function findBlobMedia(id: string) {
  if (!eventSetupMediaIdPattern.test(id)) return null;
  const result = await get(manifestPath(id), privateRead);
  if (!result || result.statusCode !== 200) return null;
  // Only the server can create manifests, after it verifies the uploaded bytes.
  const value: Partial<BlobMediaManifest> | null = await new Response(result.stream).json();
  if (
    !value ||
    typeof value.eventId !== "string" || !value.eventId ||
    !isMediaKind(value.kind) || !isSupportedType(value.type) ||
    typeof value.size !== "number" || !Number.isSafeInteger(value.size) ||
    value.size < 1 || value.size >= IMAGE_MAX_INPUT_BYTES
  ) {
    return null;
  }
  const { eventId, kind, type, size } = value;
  return { id, eventId, kind, type, size, blobPath: mediaPath(eventId, kind, type, id) };
}

export async function readBlobMedia(pathname: string, type: MediaContentType, size?: number) {
  const result = await get(pathname, privateRead);
  if (!result || result.statusCode !== 200) return null;
  const meta = result.blob;
  if (
    !Number.isSafeInteger(meta.size) || meta.size < 1 || meta.size >= IMAGE_MAX_INPUT_BYTES ||
    meta.contentType !== type || (size !== undefined && meta.size !== size)
  ) {
    await result.stream.cancel();
    return null;
  }
  const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  if (bytes.length !== meta.size || !matchesImageType(bytes, type)) return null;
  return new Uint8Array(bytes);
}

export async function finalizeBlobMediaUpload(
  eventId: string, kind: EventSetupMediaKind, contentType: string, id: string,
) {
  if (!isSupportedType(contentType)) throw new ServiceError("UNSUPPORTED_SETUP_MEDIA", 415);
  const pathname = mediaPath(eventId, kind, contentType, id);
  const bytes = await readBlobMedia(pathname, contentType);
  if (!bytes) throw new ServiceError("INVALID_SETUP_MEDIA", 400);

  // Abandoned and invalid uploads expire. Clear the TTL before exposing a durable reference.
  await setTtl(pathname, { ttlDays: null });
  const manifest: BlobMediaManifest = { eventId, kind, type: contentType, size: bytes.byteLength };
  try {
    await put(manifestPath(id), JSON.stringify(manifest), {
      access: "private", contentType: "application/json", allowOverwrite: false, addRandomSuffix: false,
    });
  } catch (error) {
    // Concurrent completions and retries may observe an already committed manifest.
    const saved = await findBlobMedia(id);
    if (saved?.blobPath !== pathname || saved.size !== manifest.size) throw error;
  }
  return { url: eventSetupMediaUrl(id) };
}

export async function blobMediaAvailable(pathname: string, type: MediaContentType, size: number) {
  try {
    // A ready manifest describes a verified object at a write-once pathname.
    const object = await head(pathname);
    return object.pathname === pathname && object.contentType === type && object.size === size;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    throw error;
  }
}

export async function signBlobMediaRead(pathname: string) {
  const validUntil = Date.now() + 60_000;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, {
    pathname, operation: "get", access: "private", validUntil,
  });
  return presignedUrl;
}
