"use client";
import { bannerObjectPosition } from "@/core/event/banner-layout";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { defaultEventBranding } from "@/core/event/branding";
import type { ParticipantEventData } from "@/types/event/participant";
import SetupDisplayContent from "./SetupDisplayContent";

export default function SetupDisplayPreview({
  draft,
  branding,
  bannerUrl,
  compact = false,
}: ParticipantEventData & { compact?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const landscape = branding.layout === "landscape";
  const width = landscape ? 1920 : 1080;
  const height = landscape ? 1080 : 1920;
  useEffect(() => {
    const container = box.current,
      artwork = scene.current;
    if (!container || !artwork) return;
    const resize = () => {
      const byWidth = container.clientWidth / width;
      setScale(
        compact
          ? Math.min(
              byWidth,
              (container.clientHeight * 0.97344) / artwork.offsetHeight,
            )
          : Math.min(1, byWidth),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    observer.observe(artwork);
    return () => observer.disconnect();
  }, [compact, width]);
  const banner = branding.banner?.url ?? bannerUrl;
  const defaultMat =
    !branding.backgroundMode &&
    branding.secondary.toLowerCase() ===
      defaultEventBranding.secondary.toLowerCase();
  const background: CSSProperties = defaultMat
    ? {}
    : {
        backgroundColor: branding.secondary,
        backgroundImage:
          branding.backgroundMode === "gradient"
            ? `linear-gradient(${branding.gradientAngle ?? 0}deg, ${branding.secondary}, ${branding.gradientEnd ?? branding.primary})`
            : "none",
      };
  return (
    <div
      ref={box}
      className={`setup-display-stage ${compact ? "setup-display-stage--compact" : "setup-display-stage--full"}`}
      style={background}
    >
      {branding.backgroundMode === "blur" && banner && (
        <div
          aria-hidden="true"
          className="setup-display-stage__blur"
          style={{
            backgroundImage: `url(${JSON.stringify(banner)})`,
            backgroundPosition: bannerObjectPosition(
              branding.banner?.cropPosition,
            ),
          }}
        />
      )}
      <div
        ref={scene}
        className="setup-display-stage__art"
        style={{
          width,
          minHeight: height,
          zoom: scale ?? 1,
          visibility: scale === null ? "hidden" : undefined,
        }}
      >
        <SetupDisplayContent
          draft={draft}
          branding={branding}
          bannerUrl={bannerUrl}
          compact={compact}
        />
      </div>
    </div>
  );
}
