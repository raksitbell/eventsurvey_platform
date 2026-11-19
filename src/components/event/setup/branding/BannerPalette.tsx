"use client";

import { bannerPalette } from "@/core/event/branding-colors";
import { useEffect, useState } from "react";

export default function BannerPalette({
  id,
  src,
}: {
  id: string;
  src: string;
}) {
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    const image = new globalThis.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = canvas.height = 32;
      const context = canvas.getContext("2d");
      if (!context) return;
      try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        setColors(bannerPalette(data));
      } catch {
        // Some externally hosted banners allow display but prohibit sampling.
      }
    };
    image.src = src;
    return () => {
      image.onload = null;
      image.removeAttribute("src");
    };
  }, [src]);

  if (!colors.length) return null;
  return (
    <datalist id={id}>
      {colors.map((color) => (
        <option key={color} value={color} />
      ))}
    </datalist>
  );
}
