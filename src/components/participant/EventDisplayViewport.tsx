"use client";

import EventDisplay, { type EventDisplayProps } from "@/components/participant/EventDisplay";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const SIZE = {
  portrait: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
} as const;

export default function EventDisplayViewport(props: EventDisplayProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });
  const size = SIZE[props.layout];

  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  const scale = available.width && available.height
    ? Math.min(available.width / size.width, available.height / size.height)
    : 0;

  return (
    <div ref={frame} className="participant-viewport">
      <div className="participant-scaled" style={{ width: size.width, height: size.height, "--display-scale": scale } as CSSProperties}>
        <EventDisplay {...props} />
      </div>
    </div>
  );
}
