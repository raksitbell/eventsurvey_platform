import type { ParticipantFormKind } from "@/types/event/participant";
import Image from "next/image";

interface EventDisplayQrProps {
  registration: string;
  survey: string;
  placeholder: string;
  vertical: boolean;
  previewForms?: ParticipantFormKind[];
}

const displayForms = ["registration", "survey"] as const;

export default function EventDisplayQr({
  registration,
  survey,
  placeholder,
  vertical,
  previewForms,
}: EventDisplayQrProps) {
  const forms = previewForms ?? displayForms;
  if (!forms.length) return null;
  return (
    <section
      className={`participant-card participant-qr ${vertical ? "participant-qr--vertical" : ""}`}
      aria-label={placeholder}
    >
      {forms.map((kind) => {
        const label = kind === "registration" ? registration : survey;
        return (
          <div className="participant-qr-item" key={kind}>
            <h2>{label}</h2>
            {previewForms ? (
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
