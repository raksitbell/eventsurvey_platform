"use client";

import { Modal } from "@/components/ui/modal";
import { eventColorForeground } from "@/core/event/participant-colors";
import { useModal } from "@/hooks/useModal";
import { Link } from "@/i18n/navigation";
import type { ParticipantFormKind } from "@/types/event/participant";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";

interface Props {
  kind: ParticipantFormKind;
  eventHref: string;
  accent: string;
  returnId: string;
}

export default function ParticipantCapacityDialog({ kind, eventHref, accent, returnId }: Props) {
  const t = useTranslations("publicParticipantForm");
  const { isOpen, closeModal } = useModal(true);
  const headingId = useId();
  const action = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    action.current?.focus({ preventScroll: true });
    return () => globalThis.document.getElementById(returnId)?.focus({ preventScroll: true });
  }, [isOpen, returnId]);

  if (!isOpen) return null;
  return (
    <Modal
      isOpen
      onClose={closeModal}
      showCloseButton={false}
      labelledBy={headingId}
      backdropClassName="bg-black/50"
      className="max-h-[calc(100dvh-2rem)] max-w-145 space-y-4 overflow-y-auto rounded-2xl p-6 text-participant-text sm:rounded-3xl sm:p-8 dark:text-gray-100"
    >
      <p className="text-theme-sm font-semibold">{t("accessStatus")}</p>
      <h2 id={headingId} className="text-2xl font-bold">{t(kind === "registration" ? "registrationFull" : "surveyFull")}</h2>
      <p className="text-theme-sm text-participant-muted dark:text-gray-300">{t("full")}</p>
      <Link
        href={eventHref}
        ref={action}
        onKeyDown={(event) => {
          if (event.key === "Tab") event.preventDefault();
        }}
        style={{ backgroundColor: accent, color: eventColorForeground(accent) }}
        className="flex min-h-12 items-center justify-center rounded-xl px-4 text-theme-sm font-semibold"
      >
        {t("backToEvent")}
      </Link>
    </Modal>
  );
}
