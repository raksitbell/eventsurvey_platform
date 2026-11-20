import { GlobeAltIcon } from "@heroicons/react/24/outline";
import type { EventDisplayData } from "@/types/participant/display";
import Image from "next/image";
import type { EventDisplayProps } from "./EventDisplay";
import EventDisplayLanguage from "./EventDisplayLanguage";

interface EventDisplayInformationProps {
  data: EventDisplayData;
  labels: {
    hostedBy: string;
    hostedBySubtitle: string;
    about: string;
    aboutSubtitle: string;
  };
  event?: EventDisplayProps["event"];
  published: boolean;
}

function socialIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "x":
    case "twitter":
      return "twitter";
    case "facebook":
      return "facebook";
    case "instagram":
      return "instagram";
    default:
      return null;
  }
}

export default function EventDisplayInformation({
  data,
  labels,
  event,
  published,
}: EventDisplayInformationProps) {
  const Title = event && !published ? "h2" : "h1";
  const Heading = published ? "h2" : event ? "h3" : "strong";
  const channels =
    event?.channels ??
    ["twitter", "facebook", "instagram"].map((platform) => ({
      key: platform,
      platform,
      label: data.socialHandle,
    }));
  const contentLocale = event?.contentLocale;
  const title = (
    <Title className="participant-display-title" lang={contentLocale} dir="auto">
      {data.title}
    </Title>
  );
  return (
    <section
      className="participant-card participant-information"
      aria-label={data.title}
    >
      {published ? (
        <div className="participant-title-row">
          {title}
          <EventDisplayLanguage />
        </div>
      ) : title}
      <div className="participant-section-heading">
        <Heading>{labels.hostedBy}</Heading>
        <span>{labels.hostedBySubtitle}</span>
      </div>
      <div className="participant-divider" />
      <div className="participant-organizer-row">
        <div className="participant-organizer">
          {event?.logo ? (
            <Image
              src={event.logo.src}
              alt=""
              width={event.logo.wordmark ? 128 : 32}
              height={32}
              unoptimized
              className="participant-organizer-logo"
              data-wordmark={event.logo.wordmark}
            />
          ) : (
            <span
              className="participant-avatar"
              aria-hidden={event ? true : undefined}
            >
              {data.organizerInitial}
            </span>
          )}
          <div className="participant-organizer-text">
            <strong>
              <bdi>{data.organizer}</bdi>
            </strong>
            {event?.tagline && (
              <span>
                <bdi>{event.tagline}</bdi>
              </span>
            )}
          </div>
        </div>
        {channels.length > 0 && (
          <div
            className="participant-socials"
            aria-label={event ? undefined : data.socialHandle}
          >
            {channels.map(({ key, platform, label }) => {
              const icon = socialIcon(platform);
              return (
                <span
                  key={key}
                  className="participant-social"
                  title={event ? platform : undefined}
                >
                  {icon ? (
                    <Image
                      src={`/images/participant/${icon}.svg`}
                      alt=""
                      width={24}
                      height={24}
                    />
                  ) : (
                    <GlobeAltIcon aria-hidden="true" />
                  )}
                  {event && <span className="sr-only">{platform} </span>}
                  <bdi>{label}</bdi>
                </span>
              );
            })}
          </div>
        )}
      </div>
      <div className="participant-divider" />
      <div className="participant-metadata">
        <div className="participant-meta-item">
          <span className="participant-meta-icon">
            <Image src="/images/event-publication/calendar.svg" alt="" width={32} height={32} />
          </span>
          <div>
            <strong>{data.startsAt}</strong>
            {data.endsAt && <span>{data.endsAt}</span>}
          </div>
        </div>
        <div className="participant-meta-item">
          <span className="participant-meta-icon">
            <Image src="/images/event-publication/venue.svg" alt="" width={32} height={32} />
          </span>
          <div lang={contentLocale} dir="auto">
            <strong>{data.location}</strong>
            {data.locationDetail && <span>{data.locationDetail}</span>}
          </div>
        </div>
      </div>
      {(!event || data.description) && (
        <div className="participant-about">
          <div className="participant-section-heading">
            <Heading>{labels.about}</Heading>
            <span>{labels.aboutSubtitle}</span>
          </div>
          <div className="participant-divider" />
          <p lang={contentLocale} dir="auto">
            {data.description}
          </p>
        </div>
      )}
    </section>
  );
}
