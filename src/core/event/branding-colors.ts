import type { BrandingColorKey } from "@/types/event/branding";

// Exact preset and interaction values from the Figma Theme Customization states.
export const BRANDING_COLOR_PRESETS: Record<
  BrandingColorKey,
  readonly string[]
> = {
  primary: ["#AE85D1", "#2563EB", "#0D9488", "#EA580C", "#DB2777"],
  secondary: ["#E9DBF5", "#DBEAFE", "#CCFBF1", "#FFEDD5", "#FCE7F3"],
  accent: ["#8365A0", "#4338CA", "#047857", "#B45309", "#A21CAF"],
};
export interface BrandingHsv {
  hue: number;
  saturation: number;
  brightness: number;
}

export function hexToHsv(color: string): BrandingHsv {
  const [r, g, b] = [1, 3, 5].map(
    (offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255,
  );
  const high = Math.max(r, g, b),
    low = Math.min(r, g, b),
    delta = high - low;
  const hue = !delta
    ? 0
    : high === r
      ? ((g - b) / delta) % 6
      : high === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return {
    hue: (hue * 60 + 360) % 360,
    saturation: high ? delta / high : 0,
    brightness: high,
  };
}

export function hsvToHex({ hue, saturation, brightness }: BrandingHsv): string {
  const h = (((hue % 360) + 360) % 360) / 60;
  const s = Math.max(0, Math.min(1, saturation));
  const v = Math.max(0, Math.min(1, brightness));
  const chroma = v * s,
    x = chroma * (1 - Math.abs((h % 2) - 1)),
    m = v - chroma;
  const [r, g, b] =
    h < 1
      ? [chroma, x, 0]
      : h < 2
        ? [x, chroma, 0]
        : h < 3
          ? [0, chroma, x]
          : h < 4
            ? [0, x, chroma]
            : h < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return `#${[r, g, b]
    .map((c) =>
      Math.round((c + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}
