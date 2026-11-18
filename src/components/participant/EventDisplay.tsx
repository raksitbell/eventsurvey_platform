import EventDisplayBanner from "@/components/participant/EventDisplayBanner";
import EventDisplayInformation from "@/components/participant/EventDisplayInformation";
import EventDisplayQr from "@/components/participant/EventDisplayQr";
import type { EventDisplayData, EventDisplayLayout } from "@/types/participant/display";
import { Inter } from "next/font/google";
import "./event-display.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-participant-inter" });

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
}

export default function EventDisplay({ layout, data, labels }: EventDisplayProps) {
  return (
    <main className={`${inter.variable} participant-display participant-display--${layout}`}>
      <div className="participant-content">
        <EventDisplayBanner layout={layout} label={labels.bannerPlaceholder} />
        {layout === "landscape" && <div className="participant-banner-divider" />}
        <div className="participant-content-bottom">
          <EventDisplayInformation data={data} labels={labels} />
          <EventDisplayQr registration={labels.registration} survey={labels.survey} placeholder={labels.qrPlaceholder} vertical={layout === "landscape"} />
        </div>
      </div>
    </main>
  );
}
