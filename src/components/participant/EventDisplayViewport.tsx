"use client";

import { displayCanvasSize } from "@/core/event/banner-layout";
import type { EventDisplayLayout } from "@/types/participant/display";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export default function EventDisplayViewport({ layout, children }: { layout: EventDisplayLayout; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0, contentHeight: 0 });
  const size = displayCanvasSize(layout);
  const router = useRouter();

  useEffect(() => {
    const timer = globalThis.setInterval(() => router.refresh(), 30_000);
    return () => globalThis.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    const viewport = frame.current;
    const content = canvas.current;
    if (!viewport || !content) return;
    const observer = new globalThis.ResizeObserver(() => {
      setAvailable({ width: viewport.clientWidth, height: viewport.clientHeight, contentHeight: content.offsetHeight });
    });
    observer.observe(viewport);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const scale = available.width && available.height
    ? Math.min(available.width / size.width, available.height / Math.max(size.height, available.contentHeight))
    : 0;

  return (
    <div ref={frame} className="participant-viewport">
      <div ref={canvas} className="participant-scaled" style={{ width: size.width, minHeight: size.height, "--display-scale": scale } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}
