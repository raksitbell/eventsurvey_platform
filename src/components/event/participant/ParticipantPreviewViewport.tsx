"use client";

import ParticipantEventScreen from "@/components/event/participant/ParticipantEventScreen";
import { PARTICIPANT_VIEWPORTS } from "@/core/event/participant";
import type {
  ParticipantDevice,
  ParticipantEventData,
} from "@/types/event/participant";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
interface ParticipantPreviewViewportProps extends ParticipantEventData {
  device: ParticipantDevice;
  fitContent?: boolean;
  readOnly?: boolean;
}
/** Render the shared screen at its real design viewport, then scale the entire viewport. */
export default function ParticipantPreviewViewport({
  device,
  fitContent = false,
  readOnly = false,
  ...data
}: ParticipantPreviewViewportProps) {
  const container = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [available, setAvailable] = useState(0);
  const viewport = PARTICIPANT_VIEWPORTS[device];
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setAvailable(entries[0].contentRect.width),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!fitContent || !content.current) return;
    const observer = new ResizeObserver((entries) =>
      setContentHeight(entries[0].contentRect.height),
    );
    observer.observe(content.current);
    return () => observer.disconnect();
  }, [fitContent]);
  const scale = available ? Math.min(1, available / viewport.width) : 1;
  return (
    <div ref={container} className="w-full min-w-0">
      <div
        className="relative mx-auto w-full overflow-hidden"
        style={{
          maxWidth: viewport.width,
          height:
            (fitContent
              ? Math.max(viewport.height, contentHeight)
              : viewport.height) * scale,
        }}
      >
        <div
          ref={content}
          className={`absolute start-0 top-0 origin-top-left rtl:origin-top-right ${fitContent ? "" : "overflow-y-auto"}`}
          style={
            {
              width: viewport.width,
              height: fitContent ? undefined : viewport.height,
              transform: `scale(${scale})`,
              "--participant-viewport-height": `${viewport.height}px`,
            } as CSSProperties
          }
        >
          <ParticipantEventScreen
            key={device}
            {...data}
            embedded
            readOnly={readOnly}
            initialDevice={device}
          />
        </div>
      </div>
    </div>
  );
}
