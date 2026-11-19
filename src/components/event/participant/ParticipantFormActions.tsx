"use client";

import { participantFormActions } from "@/core/event/participant";
import { Link } from "@/i18n/navigation";
import type { PublicEvent } from "@/types/event/public-event";
import type { EventDraft } from "@/types/event/setup";
import { useTranslations } from "next-intl";
import Image from "next/image";

interface ParticipantFormActionsProps {
  draft: EventDraft;
  formLinks?: PublicEvent["formLinks"];
}

const labelClassName =
  "text-base font-semibold text-(--participant-link) @4xl/participant:text-xl dark:text-(--participant-link)";

export default function ParticipantFormActions({
  draft,
  formLinks,
}: ParticipantFormActionsProps) {
  const t = useTranslations("participantEvent");
  const forms = participantFormActions(draft).filter(
    (kind) => !formLinks || formLinks[kind],
  );

  if (formLinks && !forms.length) return null;

  return (
    <div className="flex flex-wrap justify-around gap-4 px-4 py-1">
      {forms.map((kind) => {
        const link = formLinks?.[kind];
        const qrSrc = formLinks
          ? link?.qrDataUrl
          : `/images/event-preview/${kind}.svg`;
        return (
          <div
            key={kind}
            className="flex w-32 flex-col items-center text-center @4xl/participant:w-36"
          >
            {link ? (
              <Link href={link.href} className={`${labelClassName} underline`}>
                {t(kind)}
              </Link>
            ) : (
              <span className={labelClassName}>
                {t(kind === "registration" ? "registrationQr" : "surveyQr")}
              </span>
            )}
            {qrSrc && (
              <>
                <Image
                  src={qrSrc}
                  alt={t("qrAlt", { form: t(kind) })}
                  width={126}
                  height={126}
                  unoptimized={Boolean(link)}
                  className="my-1 h-auto w-25 bg-white @4xl/participant:w-31.5"
                />
                <span className="text-theme-xs text-(--participant-on-secondary) @4xl/participant:text-base dark:text-(--participant-on-secondary)">
                  {t(
                    kind === "registration" ? "registrationHint" : "surveyHint",
                  )}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
