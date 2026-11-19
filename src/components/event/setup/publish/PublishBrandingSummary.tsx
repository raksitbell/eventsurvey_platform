import PublicationIcon from "@/components/event/qr/PublicationIcon";
import { getChromeOpacity } from "@/core/event/participant-colors";
import type { EventBranding } from "@/types/event/branding";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface PublishBrandingSummaryProps {
  branding: EventBranding;
  canEdit: boolean;
  onEdit: () => void;
}

export default function PublishBrandingSummary({
  branding,
  canEdit,
  onEdit,
}: PublishBrandingSummaryProps) {
  const labels = useTranslations("eventPublishedView");
  const setup = useTranslations("eventSetup");
  const logo =
    branding.identity === "wordmark" ? branding.wordmark : branding.logo;
  const opacity = getChromeOpacity(branding);

  return (
    <button
      type="button"
      className="publish-branding-summary"
      disabled={!canEdit}
      onClick={onEdit}
    >
      <PublicationIcon name="palette" size={18} />
      <span className="publish-branding-summary__values">
        <strong>{labels("brandingTitle")}</strong>
        <small>{labels("hosted")} · {branding.organizer || "—"}</small>
        <small>
          {setup(branding.identity ?? "icon")} ·{" "}
          {setup(branding.backgroundMode ?? "solid")}
        </small>
        <small>
          {labels("chrome")} · {branding.primary} /{" "}
          {branding.footerColor ?? branding.secondary}
          {opacity < 100 &&
            ` · ${labels("transparencyValue", { percent: 100 - opacity })}`}
        </small>
      </span>
      {logo && (
        <Image
          className="publish-branding-summary__logo"
          src={logo.url}
          width={116}
          height={30}
          alt={logo.name}
          unoptimized
        />
      )}
    </button>
  );
}
