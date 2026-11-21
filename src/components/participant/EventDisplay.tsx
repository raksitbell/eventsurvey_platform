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
import type { PublicEvent } from "@/types/event/public-event";
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
  event?: {
    contentLocale: string;
    languages: string[];
    banner: string | null;
    bannerLabel: string;
    bannerPosition?: string;
    logo: { src: string; wordmark: boolean } | null;
    tagline?: string;
    channels: { key: string; platform: string; label: string }[];
    forms: ParticipantFormKind[];
    style: CSSProperties;
  };
  formLinks?: PublicEvent["formLinks"];
}

export default function EventDisplay({
  layout,
  data,
  labels,
  event,
  formLinks,
}: EventDisplayProps) {
  const published = formLinks !== undefined;
  const preview = Boolean(event) && !published;
  const Root = preview ? "div" : "main";
  const forms = published
    ? (["registration", "survey"] as const).filter((kind) => formLinks[kind])
    : event?.forms;
  return (
    <Root
      className={`${inter.variable} participant-display participant-display--${layout}`}
      data-event-display={event ? true : undefined}
      data-display-mode={published ? "published" : preview ? "preview" : undefined}
      data-display-preview={preview ? true : undefined}
      style={event?.style}
    >
      <div className="participant-content">
        <EventDisplayBanner
          layout={layout}
          label={labels.bannerPlaceholder}
          src={event?.banner}
          imageLabel={event?.bannerLabel}
          objectPosition={event?.bannerPosition}
        />
        {layout === "landscape" && (
          <div className="participant-banner-divider" aria-hidden="true" />
        )}
        <div
          className="participant-content-bottom"
          data-has-qr={forms && forms.length > 0}
        >
          <EventDisplayInformation
            data={data}
            labels={labels}
            event={event}
            published={published}
          />
          <EventDisplayQr
            registration={labels.registration}
            survey={labels.survey}
            placeholder={labels.qrPlaceholder}
            vertical={layout === "landscape"}
            forms={forms}
            formLinks={formLinks}
          />
        </div>
      </div>
    </Root>
  );
}
