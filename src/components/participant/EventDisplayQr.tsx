import { Link } from "@/i18n/navigation";
import type { ParticipantFormKind } from "@/types/event/participant";
import type { PublicEvent } from "@/types/event/public-event";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface EventDisplayQrProps {
  registration: string;
  survey: string;
  placeholder: string;
  vertical: boolean;
  forms?: readonly ParticipantFormKind[];
  formLinks?: PublicEvent["formLinks"];
}

const displayForms = ["registration", "survey"] as const;

export default function EventDisplayQr({
  registration,
  survey,
  placeholder,
  vertical,
  forms,
  formLinks,
}: EventDisplayQrProps) {
  const t = useTranslations("participantEvent");
  const visibleForms = forms ?? displayForms;
  if (!visibleForms.length) return null;
  return (
    <section
      className={`participant-card participant-qr ${vertical ? "participant-qr--vertical" : ""}`}
      aria-label={formLinks === undefined ? placeholder : undefined}
    >
      {visibleForms.map((kind) => {
        if (formLinks !== undefined) {
          const link = formLinks[kind];
          if (!link) return null;
          const label = t(kind);
          return (
            <Link
              key={kind}
              href={link.href}
              className="participant-qr-item participant-qr-link"
              aria-label={label}
            >
              <h2>{label}</h2>
              {link.qrDataUrl && (
                <Image
                  className="participant-qr-image"
                  src={link.qrDataUrl}
                  alt={t("qrAlt", { form: label })}
                  width={220}
                  height={220}
                  unoptimized
                />
              )}
            </Link>
          );
        }
        const label = kind === "registration" ? registration : survey;
        return (
          <div className="participant-qr-item" key={kind}>
            <h2>{label}</h2>
            {forms ? (
              <Image
                className="participant-qr-sample"
                src={`/images/event-preview/${kind}.svg`}
                alt={`${label} · ${placeholder}`}
                width={220}
                height={220}
                unoptimized
              />
            ) : (
              <div
                className="participant-qr-placeholder"
                role="img"
                aria-label={`${label}: ${placeholder}`}
              >
                QR
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
