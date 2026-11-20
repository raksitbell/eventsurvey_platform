import { PhotoIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { bannerLayouts } from "@/core/event/banner-layout";
import type { EventDisplayLayout } from "@/types/participant/display";

interface EventDisplayBannerProps {
  layout: EventDisplayLayout;
  label: string;
  src?: string | null;
  imageLabel?: string;
  objectPosition?: string;
}

export default function EventDisplayBanner({
  layout,
  label,
  src,
  imageLabel,
  objectPosition,
}: EventDisplayBannerProps) {
  const className = `participant-banner participant-banner--${layout}`;
  const { width, height } = bannerLayouts[layout];
  if (src) {
    return (
      <div className={className} data-has-banner>
        <Image
          src={src}
          alt={imageLabel ?? label}
          width={width}
          height={height}
          unoptimized
          style={{ objectPosition }}
        />
      </div>
    );
  }
  return (
    <div className={className} role="img" aria-label={label}>
      <PhotoIcon aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
