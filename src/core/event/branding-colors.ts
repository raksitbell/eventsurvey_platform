// Group neighboring shades so a photograph can supply representative swatches.
export function bannerPalette(pixels: Uint8ClampedArray): string[] {
  const bins = new Map<number, { count: number; hex: string }>();
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] < 128) continue;
    const [red, green, blue] = pixels.subarray(offset, offset + 3);
    const bin = ((red >> 5) << 6) | ((green >> 5) << 3) | (blue >> 5);
    const existing = bins.get(bin);
    if (existing) {
      existing.count++;
    } else {
      const rgb = (red << 16) | (green << 8) | blue;
      bins.set(bin, {
        count: 1,
        hex: `#${rgb.toString(16).padStart(6, "0").toUpperCase()}`,
      });
    }
  }
  return Array.from(bins.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map(({ hex }) => hex);
}
