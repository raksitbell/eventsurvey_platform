const supportedTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/bmp",
] as const;
export type MediaContentType = (typeof supportedTypes)[number];

export function isSupportedType(type: unknown): type is MediaContentType {
  return typeof type === "string" && supportedTypes.some((entry) => entry === type);
}

export function matchesImageType(bytes: Buffer, type: MediaContentType) {
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
