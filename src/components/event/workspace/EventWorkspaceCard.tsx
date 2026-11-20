"use client";

import { bannerObjectPosition } from "@/core/event/banner-layout";
import type { BrandingBanner } from "@/types/event/branding";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { EventWorkspace } from "@/types/event/workspace";
import EventWorkspaceDetails from "./EventWorkspaceDetails";
import EventWorkspaceTeam from "./EventWorkspaceTeam";

interface Props {
  workspace: EventWorkspace;
  banner?: BrandingBanner | null;
}

export default function EventWorkspaceCard({ workspace, banner }: Props) {
  const t = useTranslations("eventHome");
  const setup = useTranslations("eventSetup");
  const [failedUrl, setFailedUrl] = useState<string>();
  const cropPosition = bannerObjectPosition(banner?.cropPosition);
  const src = banner?.url ?? workspace.bannerUrl;

  return (
    <article className="event-overview-sheet">
      <div className="event-overview-media">
        <div className="event-overview-banner">
          {src && src !== failedUrl ? (
            <Image
              unoptimized
              src={src}
              width={396}
              height={510}
              alt={t("bannerTitle")}
              className="event-overview-upload"
              style={
                cropPosition
                  ? { objectFit: "cover", objectPosition: cropPosition }
                  : undefined
              }
              onError={() => setFailedUrl(src)}
            />
          ) : (
            <>
              <Image
                unoptimized
                src="/images/event-preview/empty-banner.png"
                alt=""
                width={224}
                height={174}
                className="event-overview-artwork"
              />
              <strong>{setup("noBanner")}</strong>
            </>
          )}
        </div>
        <EventWorkspaceTeam workspace={workspace} />
      </div>
      <EventWorkspaceDetails workspace={workspace} />
    </article>
  );
}
