"use client";

import { participantColors } from "@/core/event/participant-colors";
import ParticipantDisplayControls from "@/components/event/participant/ParticipantDisplayControls";
import ParticipantEventContent from "@/components/event/participant/ParticipantEventContent";
import ParticipantFooter from "@/components/event/participant/ParticipantFooter";
import ParticipantHeader from "@/components/event/participant/ParticipantHeader";
import type {
  ParticipantDevice,
  ParticipantEventData,
} from "@/types/event/participant";
import type { CSSProperties } from "react";
import { useState } from "react";

interface ParticipantEventScreenProps extends ParticipantEventData {
  embedded?: boolean;
  readOnly?: boolean;
  initialDevice?: ParticipantDevice;
}
export default function ParticipantEventScreen({
  embedded = false,
  readOnly = false,
  initialDevice,
  ...data
}: ParticipantEventScreenProps) {
  const [portrait, setPortrait] = useState(initialDevice === "mobile");
  const [immersive, setImmersive] = useState(false);
  const style = participantColors(data.branding) as CSSProperties;
  return (
    <div
      style={style}
      className={`mx-auto w-full bg-(--participant-surface) dark:bg-(--participant-surface) ${readOnly ? "border-2 border-solid border-event-banner/90 dark:border-brand-400" : ""} ${portrait ? "max-w-participant-mobile" : "max-w-participant-desktop"}`}
    >
      <div className="@container/participant">
        <div
          className={`flex flex-col ${embedded ? "min-h-(--participant-viewport-height)" : "min-h-dvh"}`}
        >
          {!immersive && (
            <ParticipantHeader
              logo={data.branding.logo}
              readOnly={readOnly}
              device={portrait ? "mobile" : "desktop"}
            />
          )}
          <ParticipantEventContent {...data} />
          {!immersive && <ParticipantFooter readOnly={readOnly} />}
        </div>
      </div>
      {!embedded && !readOnly && (
        <ParticipantDisplayControls
          portrait={portrait}
          immersive={immersive}
          onToggleOrientation={() => setPortrait((value) => !value)}
          onToggleImmersive={() => setImmersive((value) => !value)}
        />
      )}
    </div>
  );
}
