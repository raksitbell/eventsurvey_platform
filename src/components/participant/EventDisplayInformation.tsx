import { CalendarDaysIcon, MapPinIcon } from "@heroicons/react/24/outline";
import type { EventDisplayData } from "@/types/participant/display";
import Image from "next/image";

interface EventDisplayInformationProps {
  data: EventDisplayData;
  labels: { hostedBy: string; about: string };
}

export default function EventDisplayInformation({ data, labels }: EventDisplayInformationProps) {
  return (
    <section className="participant-card participant-information" aria-label={data.title}>
      <h1>{data.title}</h1>
      <div className="participant-section-heading"><strong>{labels.hostedBy}</strong><span>Hosted by</span></div>
      <div className="participant-divider" />
      <div className="participant-organizer-row">
        <div className="participant-organizer"><span className="participant-avatar">{data.organizerInitial}</span><strong>{data.organizer}</strong></div>
        <div className="participant-socials" aria-label={data.socialHandle}>
          {["twitter", "facebook", "instagram"].map((name) => (
            <span key={name} className="participant-social"><Image src={`/images/participant/${name}.svg`} alt="" width={24} height={24} /><span>{data.socialHandle}</span></span>
          ))}
        </div>
      </div>
      <div className="participant-divider" />
      <div className="participant-metadata">
        <div className="participant-meta-item"><span className="participant-meta-icon"><CalendarDaysIcon aria-hidden="true" /></span><div><strong>{data.startsAt}</strong><span>{data.endsAt}</span></div></div>
        <div className="participant-meta-item"><span className="participant-meta-icon"><MapPinIcon aria-hidden="true" /></span><div><strong>{data.location}</strong><span>{data.locationDetail}</span></div></div>
      </div>
      <div className="participant-about"><div className="participant-section-heading"><strong>{labels.about}</strong><span>About Event</span></div><div className="participant-divider" /><p>{data.description}</p></div>
    </section>
  );
}
