interface EventDisplayQrProps {
  registration: string;
  survey: string;
  placeholder: string;
  vertical: boolean;
}

export default function EventDisplayQr({ registration, survey, placeholder, vertical }: EventDisplayQrProps) {
  return (
    <section className={`participant-card participant-qr ${vertical ? "participant-qr--vertical" : ""}`} aria-label={placeholder}>
      {[registration, survey].map((label) => (
        <div className="participant-qr-item" key={label}>
          <h2>{label}</h2>
          <div className="participant-qr-placeholder" role="img" aria-label={`${label}: ${placeholder}`}>QR</div>
        </div>
      ))}
    </section>
  );
}
