import { z } from "zod";
import type { EventBranding } from "@/types/event/branding";
import type { DraftSaveStatus } from "@/types/event/setup";

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const image = z
  .object({
    name: z.string().max(255),
    url: z
      .string()
      .max(1500000)
      .regex(/^data:image\/(png|jpeg|webp|svg\+xml);base64,/),
  })
  .nullable();
export const eventBrandingSchema = z.object({
  primary: color,
  secondary: color,
  accent: color,
  logo: image,
  banner: image,
});
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
export function saveEventBranding(
  key: string,
  branding: EventBranding,
): DraftSaveStatus {
  const parsed = eventBrandingSchema.safeParse(branding);
  if (!parsed.success) return "invalid";
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(parsed.data));
    return "saved";
  } catch {
    return "error";
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
