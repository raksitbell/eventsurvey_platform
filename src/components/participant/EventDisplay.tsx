import EventDisplayBanner from "@/components/participant/EventDisplayBanner";
import EventDisplayInformation from "@/components/participant/EventDisplayInformation";
import EventDisplayQr from "@/components/participant/EventDisplayQr";
import type {
  EventDisplayData,
  EventDisplayLayout,
} from "@/types/participant/display";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import type { ParticipantFormKind } from "@/types/event/participant";
import "./event-display.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-participant-inter",
});

export interface EventDisplayProps {
  layout: EventDisplayLayout;
  data: EventDisplayData;
  labels: {
    hostedBy: string;
    hostedBySubtitle: string;
    about: string;
    aboutSubtitle: string;
    registration: string;
    survey: string;
    bannerPlaceholder: string;
    qrPlaceholder: string;
  };
  preview?: {
    contentLocale: string;
    banner: string | null;
    bannerLabel: string;
    bannerPosition?: string;
    logo: { src: string; wordmark: boolean } | null;
    tagline?: string;
    channels: { key: string; platform: string; label: string }[];
    forms: ParticipantFormKind[];
    style: CSSProperties;
  };
}

export default function EventDisplay({
  layout,
  data,
  labels,
  preview,
}: EventDisplayProps) {
  const Root = preview ? "div" : "main";
  return (
    <Root
      className={`${inter.variable} participant-display participant-display--${layout}`}
      data-display-preview={preview ? true : undefined}
      style={preview?.style}
    >
      <div className="participant-content">
        <EventDisplayBanner
          layout={layout}
          label={labels.bannerPlaceholder}
          src={preview?.banner}
          imageLabel={preview?.bannerLabel}
          objectPosition={preview?.bannerPosition}
        />
        {layout === "landscape" && (
          <div className="participant-banner-divider" aria-hidden="true" />
        )}
        <div
          className="participant-content-bottom"
          data-has-qr={preview ? preview.forms.length > 0 : undefined}
        >
          <EventDisplayInformation
            data={data}
            labels={labels}
            preview={preview}
          />
          <EventDisplayQr
            registration={labels.registration}
            survey={labels.survey}
            placeholder={labels.qrPlaceholder}
            vertical={layout === "landscape"}
            previewForms={preview?.forms}
          />
        </div>
      </div>
    </Root>
  );
}
