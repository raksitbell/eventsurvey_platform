import type { EventBranding } from "@/types/event/branding";

function rgb(hex: string): number[] {
  return [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
}
function luminance(channels: number[]): number {
  return channels.reduce(
    (sum, c, index) =>
      sum +
      (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) *
        [0.2126, 0.7152, 0.0722][index],
    0,
  );
}
function hex(channels: number[]): string {
  return `#${channels
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
export function eventColorForeground(color: string): string {
  return luminance(rgb(color)) <= 0.18333 ? "#FFFFFF" : "#000000";
}
/** Preserve Accent where possible; adjust against the surface where it is drawn. */
function readableAccent(accentHex: string, backgroundHex: string): string {
  const background = rgb(backgroundHex);
  const foreground = rgb(eventColorForeground(backgroundHex));
  const accent = rgb(accentHex);
  const contrast = (color: number[]) => {
    const values = [luminance(color), luminance(background)].sort(
      (a, b) => b - a,
    );
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  let link = accent;
  // Check the quantized CSS color so rounding cannot drop it below 4.5:1.
  for (let i = 1; contrast(rgb(hex(link))) < 4.5 && i <= 100; i++)
    link = accent.map((c, index) => c + (foreground[index] - c) * (i / 100));
  return hex(link);
}

export function participantColors(
  branding: Pick<EventBranding, "primary" | "secondary" | "accent">,
) {
  return {
    "--participant-primary": branding.primary,
    "--participant-secondary": branding.secondary,
    "--participant-on-primary": eventColorForeground(branding.primary),
    "--participant-on-secondary": eventColorForeground(branding.secondary),
    "--participant-link": readableAccent(branding.accent, branding.secondary),
    "--participant-control-text": readableAccent(branding.accent, "#FFFFFF"),
    "--participant-accent": branding.accent,
    "--participant-surface": branding.secondary,
  };
}
