"use client";

import { afterSaved } from "@/core/event/draft";
import {
  participantPreviewHref,
  participantPreviewReturnHref,
  participantPreviewSelection,
} from "@/core/event/participant";
import { Link, useRouter } from "@/i18n/navigation";
import type {
  ParticipantPreviewOrigin,
  ParticipantPreviewSelection,
} from "@/types/event/participant";
import { useSearchParams } from "next/navigation";
import { useState, type ComponentProps } from "react";
import BrandingPreviewGallery from "./BrandingPreviewGallery";

type Props = Omit<
  ComponentProps<typeof BrandingPreviewGallery>,
  "selectionState" | "fullPreview"
> & {
  origin: ParticipantPreviewOrigin;
  label: string;
  onOpen: () => boolean | Promise<boolean>;
  disabled?: boolean;
  openFromDisplay?: boolean;
};

export default function SetupPreviewGallery({
  origin,
  label,
  onOpen,
  disabled,
  openFromDisplay,
  children,
  ...gallery
}: Props) {
  const router = useRouter();
  const query = useSearchParams();
  const selectionState = useState(() =>
    participantPreviewSelection(query.getAll("tab"), query.getAll("form")),
  );
  const [opening, setOpening] = useState(false);
  const unavailable = disabled || opening;

  async function openPreview(selection: ParticipantPreviewSelection) {
    if (unavailable) return;
    setOpening(true);
    try {
      await afterSaved(onOpen, () => {
        const source = participantPreviewReturnHref(
          origin,
          gallery.contentLocale,
          selection,
        );
        globalThis.history.replaceState(null, "", source);
        router.push(
          participantPreviewHref(origin, gallery.contentLocale, selection),
        );
      });
    } finally {
      setOpening(false);
    }
  }

  return (
    <BrandingPreviewGallery
      {...gallery}
      selectionState={selectionState}
      fullPreview={{ label, disabled: unavailable, onOpen: openPreview }}
    >
      {openFromDisplay ? (
        <div className="relative">
          {children}
          {!unavailable && (
            <Link
              href={participantPreviewHref(
                origin,
                gallery.contentLocale,
                selectionState[0],
              )}
              aria-label={label}
              onNavigate={(event) => {
                event.preventDefault();
                void openPreview(selectionState[0]);
              }}
              className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-event-action"
            />
          )}
        </div>
      ) : (
        children
      )}
    </BrandingPreviewGallery>
  );
}
