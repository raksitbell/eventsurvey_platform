import { PhotoIcon } from "@heroicons/react/24/outline";
import type { EventDisplayLayout } from "@/types/participant/display";

interface EventDisplayBannerProps {
  layout: EventDisplayLayout;
  label: string;
}

export default function EventDisplayBanner({ layout, label }: EventDisplayBannerProps) {
  return (
    <div className={`participant-banner participant-banner--${layout}`} role="img" aria-label={label}>
      <PhotoIcon aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
