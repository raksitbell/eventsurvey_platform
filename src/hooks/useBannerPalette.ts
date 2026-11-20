"use client";

import { bannerPalette } from "@/core/event/branding-colors";
import { useEffect, useState } from "react";

export default function useBannerPalette(src: string | null) {
  const [sample, setSample] = useState<{
    src: string;
    colors: string[];
  } | null>(null);

  useEffect(() => {
    if (!src) return;
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
        setSample({ src, colors: bannerPalette(data) });
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

  return sample && sample.src === src ? sample.colors : [];
}
