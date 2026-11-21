import { api } from "@/core/api";
import { bannerLayouts } from "@/core/event/banner-layout";
import { brandingDataUrlPrefix, eventBrandingSchema } from "@/core/event/branding";
import { isEventSetupMediaUrl } from "@/core/event/setup-media-url";
import type { BrandingBanner, EventBranding } from "@/types/event/branding";
import type { EventSetupMediaKind } from "@/types/event/setup";
import {
  IMAGE_MAX_LOCAL_BYTES,
  ImageUploadError,
  rasterizeBrandingSvg,
} from "@/utils/image-upload";

const mediaFields = ["logo", "wordmark", "banner"] as const;
const localMediaSchema = eventBrandingSchema
  .pick({ logo: true, wordmark: true, banner: true })
  .partial();
type LocalMedia = Partial<Record<EventSetupMediaKind, BrandingBanner>>;
type MediaUploadTarget =
  | { mode: "disk" }
  | { mode: "blob"; id: string; uploadUrl: string };
const mediaEndpoint = "/event/setup/media";

export function setupLocalMediaKey(userId: string, eventId: string, locale: string) {
  const scope = [userId, eventId, locale].map(encodeURIComponent).join(":");
  return `eventsurvey:event-setup-media:v1:${scope}`;
}

export function readSetupLocalMedia(key: string): LocalMedia {
  try {
    const raw = globalThis.localStorage.getItem(key);
    const parsed = localMediaSchema.safeParse(raw ? JSON.parse(raw) : {});
    if (!parsed.success) return {};
    return Object.fromEntries(
      Object.entries(parsed.data).filter(([, image]) => image && brandingDataUrlPrefix.test(image.url)),
    );
  } catch {
    return {};
  }
}

function writeSetupLocalMedia(key: string, media: LocalMedia) {
  if (!Object.keys(media).length) {
    globalThis.localStorage.removeItem(key);
  } else {
    globalThis.localStorage.setItem(key, JSON.stringify(media));
  }
}

export function applySetupLocalMedia(
  branding: EventBranding,
  key: string,
  pendingMedia: readonly EventSetupMediaKind[],
): EventBranding {
  if (!pendingMedia.length) return branding;
  const local = readSetupLocalMedia(key);
  const result = { ...branding };
  for (const kind of pendingMedia) {
    if (local[kind]) result[kind] = local[kind];
  }
  return result;
}

async function uploadPreparedFile(eventId: string, kind: EventSetupMediaKind, file: File) {
  const media = { eventId, kind, contentType: file.type };
  const target = await api.post<MediaUploadTarget>(mediaEndpoint, {
    ...media,
    action: "prepare",
    size: file.size,
  });
  if (target.mode === "disk") {
    const body = new FormData();
    body.set("eventId", eventId);
    body.set("file", file);
    return api.postForm<{ url: string }>(mediaEndpoint, body);
  }
  if (target.mode !== "blob") return null;
  const upload = await globalThis.fetch(target.uploadUrl, {
    method: "PUT",
    credentials: "omit",
    redirect: "error",
    headers: {
      "Content-Type": file.type,
      "x-content-type": file.type,
      "x-vercel-blob-access": "private",
    },
    body: file,
  });
  if (!upload.ok) return null;
  return api.post<{ url: string }>(mediaEndpoint, {
    ...media,
    action: "complete",
    id: target.id,
  });
}

async function uploadImage(
  eventId: string,
  image: BrandingBanner,
  original: File,
  kind: EventSetupMediaKind,
  layout: EventBranding["layout"],
): Promise<BrandingBanner | null> {
  try {
    const file = original.type === "image/svg+xml"
      ? await rasterizeBrandingSvg(original, {
          maxDimension: kind === "banner" ? 2560 : 512,
          minimumSize: kind === "banner" ? bannerLayouts[layout ?? "portrait"] : undefined,
        })
      : original;
    const result = await uploadPreparedFile(eventId, kind, file);
    const url = result?.url;
    return typeof url === "string" && isEventSetupMediaUrl(url)
      ? { ...image, name: file.name, url }
      : null;
  } catch {
    return null;
  }
}

export async function prepareSetupBranding(
  branding: EventBranding,
  stored: EventBranding,
  previousPending: readonly EventSetupMediaKind[],
  explicitMedia: ReadonlySet<EventSetupMediaKind>,
  key: string,
  eventId: string,
) {
  const local = readSetupLocalMedia(key);
  const value = { ...branding };
  const pendingMedia = new Set(previousPending);
  let localChanged = false;
  for (const kind of mediaFields) {
    const image = value[kind];
    const prefix = image && brandingDataUrlPrefix.exec(image.url);
    if (!image || !prefix) {
      if (explicitMedia.has(kind)) pendingMedia.delete(kind);
      continue;
    }
    const decoded = globalThis.atob(image.url.slice(prefix[0].length));
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index++) {
      bytes[index] = decoded.charCodeAt(index);
    }
    const original = new File([bytes], image.name, { type: prefix[1] });
    const uploaded = await uploadImage(eventId, image, original, kind, branding.layout);
    if (uploaded) {
      value[kind] = uploaded;
      pendingMedia.delete(kind);
    } else {
      if (original.size > IMAGE_MAX_LOCAL_BYTES) {
        throw new ImageUploadError("fileOutputSize");
      }
      if (!local[kind] || JSON.stringify(local[kind]) !== JSON.stringify(image)) {
        local[kind] = image;
        localChanged = true;
      }
      value[kind] = stored[kind] ?? null;
      pendingMedia.add(kind);
    }
  }
  if (localChanged) {
    try {
      writeSetupLocalMedia(key, local);
    } catch {
      throw new ImageUploadError("fileStorage");
    }
  }
  return { value, pendingMedia: [...pendingMedia] };
}

export function clearUnneededSetupLocalMedia(
  key: string,
  pendingMedia: readonly EventSetupMediaKind[],
) {
  const local = readSetupLocalMedia(key);
  const retained = Object.fromEntries(
    Object.entries(local).filter(([kind]) => pendingMedia.includes(kind as EventSetupMediaKind)),
  );
  if (Object.keys(retained).length === Object.keys(local).length) return;
  try {
    writeSetupLocalMedia(key, retained);
  } catch {
    // The accepted revision is still authoritative if the browser cannot remove old bytes.
  }
}
