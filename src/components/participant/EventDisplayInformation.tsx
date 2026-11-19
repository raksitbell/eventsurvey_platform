import {
  CalendarDaysIcon,
  GlobeAltIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import type { EventDisplayData } from "@/types/participant/display";
import Image from "next/image";
import type { EventDisplayProps } from "./EventDisplay";

interface EventDisplayInformationProps {
  data: EventDisplayData;
  labels: {
    hostedBy: string;
    hostedBySubtitle: string;
    about: string;
    aboutSubtitle: string;
  };
  preview?: EventDisplayProps["preview"];
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
  preview,
}: EventDisplayInformationProps) {
  const Title = preview ? "h2" : "h1";
  const Heading = preview ? "h3" : "strong";
  const channels =
    preview?.channels ??
    ["twitter", "facebook", "instagram"].map((platform) => ({
      key: platform,
      platform,
      label: data.socialHandle,
    }));
  const contentLocale = preview?.contentLocale;
  return (
    <section
      className="participant-card participant-information"
      aria-label={data.title}
    >
      <Title
        className="participant-display-title"
        lang={contentLocale}
        dir="auto"
      >
        {data.title}
      </Title>
      <div className="participant-section-heading">
        <Heading>{labels.hostedBy}</Heading>
        <span>{labels.hostedBySubtitle}</span>
      </div>
      <div className="participant-divider" />
      <div className="participant-organizer-row">
        <div className="participant-organizer">
          {preview?.logo ? (
            <Image
              src={preview.logo.src}
              alt=""
              width={preview.logo.wordmark ? 128 : 32}
              height={32}
              unoptimized
              className="participant-organizer-logo"
              data-wordmark={preview.logo.wordmark}
            />
          ) : (
            <span
              className="participant-avatar"
              aria-hidden={preview ? true : undefined}
            >
              {data.organizerInitial}
            </span>
          )}
          <div className="participant-organizer-text">
            <strong>
              <bdi>{data.organizer}</bdi>
            </strong>
            {preview?.tagline && (
              <span>
                <bdi>{preview.tagline}</bdi>
              </span>
            )}
          </div>
        </div>
        {channels.length > 0 && (
          <div
            className="participant-socials"
            aria-label={preview ? undefined : data.socialHandle}
          >
            {channels.map(({ key, platform, label }) => {
              const icon = socialIcon(platform);
              return (
                <span
                  key={key}
                  className="participant-social"
                  title={preview ? platform : undefined}
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
                  {preview && <span className="sr-only">{platform} </span>}
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
            <CalendarDaysIcon aria-hidden="true" />
          </span>
          <div>
            <strong>{data.startsAt}</strong>
            {data.endsAt && <span>{data.endsAt}</span>}
          </div>
        </div>
        <div className="participant-meta-item">
          <span className="participant-meta-icon">
            <MapPinIcon aria-hidden="true" />
          </span>
          <div lang={contentLocale} dir="auto">
            <strong>{data.location}</strong>
            {data.locationDetail && <span>{data.locationDetail}</span>}
          </div>
        </div>
      </div>
      {(!preview || data.description) && (
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
