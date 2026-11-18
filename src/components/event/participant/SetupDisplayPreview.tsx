"use client";
import SetupDisplayContent from "./SetupDisplayContent";
import type { ParticipantEventData } from "@/types/event/participant";
import { useEffect, useRef, useState } from "react";

export default function SetupDisplayPreview({
  draft,
  branding,
  bannerUrl,
  compact = false,
}: ParticipantEventData & { compact?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  const layout = branding.layout ?? "portrait";
  const src = branding.banner?.url ?? bannerUrl;
  const base = compact
    ? layout === "landscape"
      ? 1920
      : 1080
    : layout === "landscape"
      ? 1140
      : 850;
  const zoom = width ? Math.min(1, width / base) : 1;
  return (
    <div
      ref={box}
      className="relative isolate w-full overflow-hidden rounded-lg bg-event-tile dark:bg-gray-800"
      style={{
        backgroundColor: branding.secondary,
        backgroundImage:
          branding.backgroundMode === "gradient"
            ? `linear-gradient(${branding.gradientAngle ?? 0}deg, ${branding.secondary}, ${branding.gradientEnd ?? branding.primary})`
            : undefined,
      }}
    >
      {branding.backgroundMode === "blur" && src && (
        <div
          aria-hidden
          className="absolute inset-0 -z-1 scale-110 bg-cover bg-center opacity-70 blur-xl"
          style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
        />
      )}
      <div
        className="mx-auto"
        style={{ width: Math.min(base, width / zoom || base), zoom }}
      >
        <SetupDisplayContent
          draft={draft}
          branding={branding}
          bannerUrl={bannerUrl}
        />
      </div>
    </div>
  );
}
