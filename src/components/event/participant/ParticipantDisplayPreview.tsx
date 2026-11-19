"use client";

import ParticipantEventScreen from "./ParticipantEventScreen";
import { displayCanvasSize } from "@/core/event/banner-layout";
import type { ParticipantEventData } from "@/types/event/participant";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";

interface ParticipantDisplayPreviewProps extends ParticipantEventData {
  contentLocale?: string | null;
  fitContent?: boolean;
  fillViewport?: boolean;
}

export default function ParticipantDisplayPreview({
  draft,
  branding,
  bannerUrl,
  contentLocale,
  fitContent = true,
  fillViewport = false,
}: ParticipantDisplayPreviewProps) {
  const previewText = useTranslations("eventPreview");
  const layout = branding.layout ?? "portrait";
  const size = displayCanvasSize(layout);
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({
    width: 0,
    viewportHeight: 0,
    contentHeight: 0,
  });

  useLayoutEffect(() => {
    const viewport = frame.current;
    const canvas = content.current;
    if (!viewport || !canvas) return;
    const measure = () => {
      const width = viewport.clientWidth;
      const viewportHeight = fillViewport ? viewport.clientHeight : 0;
      const contentHeight = canvas.offsetHeight;
      setBounds((current) =>
        current.width === width &&
        current.viewportHeight === viewportHeight &&
        current.contentHeight === contentHeight
          ? current
          : { width, viewportHeight, contentHeight },
      );
    };
    measure();
    const observer = new globalThis.ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fillViewport]);

  const expandContent = fillViewport || fitContent;
  const height = Math.max(size.height, expandContent ? bounds.contentHeight : 0);
  const scale = fillViewport
    ? Math.min(bounds.width / size.width, bounds.viewportHeight / height)
    : Math.min(1, bounds.width / size.width);
  const screen = (
    <div
      ref={fillViewport ? undefined : frame}
      className="relative mx-auto w-full min-w-0 overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:border-2 after:border-solid after:border-event-banner/90 dark:after:border-brand-400"
      data-participant-display-preview
      data-layout={layout}
      role="region"
      aria-label={previewText("viewport")}
      style={{
        maxWidth: fillViewport ? undefined : size.width,
        width: fillViewport ? size.width * scale : undefined,
        aspectRatio: size.width / size.height,
        height: scale ? height * scale : undefined,
      }}
    >
      <div
        ref={content}
        className="absolute start-0 top-0 origin-top-left rtl:origin-top-right"
        style={{
          width: size.width,
          height: expandContent ? undefined : size.height,
          transform: `scale(${scale})`,
          overflowY: expandContent ? undefined : "auto",
        }}
      >
        {scale > 0 && (
          <ParticipantEventScreen
            draft={draft}
            branding={branding}
            bannerUrl={bannerUrl}
            contentLocale={contentLocale}
          />
        )}
      </div>
    </div>
  );
  if (!fillViewport) return screen;
  return (
    <div
      ref={frame}
      data-display-preview-stage
      className="grid h-full min-h-0 w-full min-w-0 place-items-center overflow-hidden"
    >
      {screen}
    </div>
  );
}
