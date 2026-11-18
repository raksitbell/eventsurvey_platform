"use client";

import ParticipantPreviewToolbar from "@/components/event/participant/ParticipantPreviewToolbar";
import type { ParticipantDevice } from "@/types/event/participant";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

interface ParticipantPreviewStateProps {
  device: ParticipantDevice;
  origin?: "branding" | "publish";
  children: ReactNode;
}
export default function ParticipantPreviewState({
  device,
  origin = "branding",
  children,
}: ParticipantPreviewStateProps) {
  const t = useTranslations("eventPreview");
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    viewport.current?.scrollTo(0, 0);
  }, [device]);
  return (
    <div
      className={`@container/preview mx-auto flex h-dvh w-full flex-col overflow-hidden bg-white dark:bg-gray-950 ${device === "mobile" ? "max-w-participant-mobile" : "max-w-participant-desktop"}`}
    >
      <ParticipantPreviewToolbar device={device} origin={origin} />
      <div
        ref={viewport}
        role="region"
        aria-label={t("viewport")}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto bg-white -outline-offset-2 dark:bg-gray-950"
      >
        {children}
      </div>
    </div>
  );
}
