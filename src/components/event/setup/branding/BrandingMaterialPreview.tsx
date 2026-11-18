import { bannerObjectPosition } from "@/core/event/banner-layout";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { eventColorForeground } from "@/core/event/participant-colors";
import type { EventBranding } from "@/types/event/branding";
import styles from "./BrandingDialog.module.css";

interface Props {
  branding: EventBranding;
  bannerUrl: string | null;
}
export default function BrandingMaterialPreview({
  branding,
  bannerUrl,
}: Props) {
  const t = useTranslations("eventBrandVisual");
  const setup = useTranslations("eventSetup");
  const participant = useTranslations("participantDisplay");
  const asset =
    branding.identity === "wordmark" ? branding.wordmark : branding.logo;
  const chrome = (color: string) => ({
    backgroundColor: branding.transparentChrome ? "transparent" : color,
    color: eventColorForeground(
      branding.transparentChrome ? branding.secondary : color,
    ),
  });
  return (
    <section
      className={styles.material}
      aria-label={setup("layoutPreview")}
      style={{
        backgroundColor: branding.secondary,
        backgroundImage:
          branding.backgroundMode === "gradient"
            ? `linear-gradient(${branding.gradientAngle ?? 0}deg,${branding.secondary},${branding.gradientEnd ?? branding.primary})`
            : undefined,
      }}
    >
      {branding.backgroundMode === "blur" && bannerUrl && (
        <Image
          src={bannerUrl}
          alt=""
          fill
          unoptimized
          className="-z-1 scale-110 object-cover opacity-60 blur-lg"
          style={{
            objectPosition: bannerObjectPosition(branding.banner?.cropPosition),
          }}
        />
      )}
      <header style={chrome(branding.primary)}>
        {asset && (
          <Image
            unoptimized
            alt={asset.name}
            src={asset.url}
            width={240}
            height={58}
          />
        )}
        {(branding.identity !== "wordmark" || !asset) && (
          <div>
            <strong>{branding.organizer || "EventSurvey"}</strong>
            {branding.tagline && (
              <p>
                <small>{branding.tagline}</small>
              </p>
            )}
          </div>
        )}
      </header>
      <div className={styles.miniForm}>
        <strong>{t("registrationTitle")}</strong>
        <span>{t("fullName")}</span>
        <b
          style={{
            backgroundColor: branding.accent,
            color: eventColorForeground(branding.accent),
          }}
        >
          {participant("registration")}
        </b>
      </div>
      <footer style={chrome(branding.footerColor ?? branding.primary)}>
        <span>{t("policies")}</span>
        <span>© EventSurvey {new Date().getFullYear()}</span>
      </footer>
    </section>
  );
}
