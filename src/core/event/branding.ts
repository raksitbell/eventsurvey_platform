import { z } from "zod";
import { isEventSetupMediaUrl } from "@/core/event/setup-media-url";
import type { EventBranding } from "@/types/event/branding";
import { IMAGE_MAX_INPUT_BYTES } from "@/utils/image-upload";

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
export const brandingDataUrlPrefix = /^data:(image\/(?:png|jpeg|webp|avif|gif|bmp|svg\+xml));base64,/;

function brandingMediaSchema(maxUrlLength: number) {
  const image = z.object({
    name: z.string().max(255),
    url: z.string().max(maxUrlLength).refine(
      (url) => brandingDataUrlPrefix.test(url) || isEventSetupMediaUrl(url),
    ),
  });
  return {
    logo: image.nullable(),
    wordmark: image.nullable().optional(),
    banner: image
      .extend({ cropPosition: z.number().min(0).max(100).optional() })
      .nullable(),
  };
}

const savedMedia = brandingMediaSchema(1_500_000);
export const eventBrandingSchema = z.object({
  layout: z.enum(["portrait", "square", "landscape"]).optional(),
  organizer: z.string().max(255).optional(),
  tagline: z.string().max(500).optional(),
  identity: z.enum(["icon", "wordmark"]).optional(),
  wordmark: savedMedia.wordmark,
  backgroundMode: z.enum(["solid", "gradient", "blur"]).optional(),
  gradientEnd: color.optional(),
  gradientAngle: z.union([z.literal(0), z.literal(90)]).optional(),
  transparentChrome: z.boolean().optional(),
  footerColor: color.optional(),
  channels: z
    .array(
      z.object({
        platform: z.string().min(1).max(32),
        url: z.httpUrl().max(2048),
      }),
    )
    .max(12)
    .optional(),
  primary: color,
  secondary: color,
  accent: color,
  logo: savedMedia.logo,
  banner: savedMedia.banner,
});

// The editor can hold a full upload in memory before storage is selected.
const maxEditUrlLength =
  4 * Math.ceil((IMAGE_MAX_INPUT_BYTES - 1) / 3) + "data:image/svg+xml;base64,".length;
export const eventBrandingEditSchema = eventBrandingSchema.extend(
  brandingMediaSchema(maxEditUrlLength),
);
export const defaultEventBranding: EventBranding = {
  primary: "#AE85D1",
  secondary: "#E9DBF5",
  accent: "#8365A0",
  logo: null,
  banner: null,
};
export function eventBrandingKey(
  userId: string,
  eventId: string,
  locale: string,
) {
  return `eventsurvey:event-branding:v1:${userId}:${eventId}:${locale}`;
}
export function loadEventBranding(key: string): EventBranding {
  try {
    const raw = globalThis.localStorage.getItem(key);
    const parsed = raw ? eventBrandingSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : { ...defaultEventBranding };
  } catch {
    return { ...defaultEventBranding };
  }
}
/** Pick readable foreground text for a user-selected background. */
export function brandingNeedsLightText(hex: string): boolean {
  if (!color.safeParse(hex).success) return false;
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 < 0.179
  );
}
