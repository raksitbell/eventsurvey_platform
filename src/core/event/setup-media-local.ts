import { api } from "@/core/api";
import { eventBrandingSchema } from "@/core/event/branding";
import { isEventSetupMediaUrl } from "@/core/event/setup-media-url";
import type { BrandingBanner, EventBranding } from "@/types/event/branding";
import type { EventSetupMediaKind } from "@/types/event/setup";

const mediaFields = ["logo", "wordmark", "banner"] as const;
const localMediaSchema = eventBrandingSchema
  .pick({ logo: true, wordmark: true, banner: true })
  .partial();
const localImagePattern = /^data:(image\/(?:png|jpeg|webp|avif|gif|bmp|svg\+xml));base64,/;
type LocalMedia = Partial<Record<EventSetupMediaKind, BrandingBanner>>;

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
      Object.entries(parsed.data).filter(([, image]) => image && localImagePattern.test(image.url)),
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

async function uploadImage(
  eventId: string,
  image: BrandingBanner,
): Promise<BrandingBanner | null> {
  const prefix = localImagePattern.exec(image.url);
  if (!prefix) return null;
  try {
    const encoded = image.url.slice(prefix[0].length);
    const bytes = Uint8Array.from(globalThis.atob(encoded), (byte) => byte.charCodeAt(0));
    const file = new File([bytes], image.name, { type: prefix[1] });
    const body = new FormData();
    body.set("eventId", eventId);
    body.set("file", file);
    const { url } = await api.postForm<{ url?: string }>("/event/setup/media", body);
    return typeof url === "string" && isEventSetupMediaUrl(url)
      ? { ...image, url }
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
  for (const kind of mediaFields) {
    const image = value[kind];
    if (!image || !localImagePattern.test(image.url)) {
      if (explicitMedia.has(kind)) pendingMedia.delete(kind);
      continue;
    }
    const uploaded = await uploadImage(eventId, image);
    if (uploaded) {
      value[kind] = uploaded;
      pendingMedia.delete(kind);
    } else {
      if (!local[kind] || JSON.stringify(local[kind]) !== JSON.stringify(image)) {
        local[kind] = image;
        writeSetupLocalMedia(key, local);
      }
      value[kind] = stored[kind] ?? null;
      pendingMedia.add(kind);
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
