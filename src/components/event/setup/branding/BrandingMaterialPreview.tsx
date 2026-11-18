import type { EventBranding } from "@/types/event/branding";
import { eventColorForeground } from "@/core/event/participant-colors";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function BrandingMaterialPreview({
  branding,
  bannerUrl,
}: {
  branding: EventBranding;
  bannerUrl: string | null;
}) {
  const t = useTranslations("eventSetup");
  const icon =
    branding.identity === "wordmark" ? branding.wordmark : branding.logo;
  const chrome = (color: string) => ({
    backgroundColor: branding.transparentChrome ? "transparent" : color,
    color: eventColorForeground(
      branding.transparentChrome ? branding.secondary : color,
    ),
  });
  return (
    <section
      className="relative isolate space-y-2 overflow-hidden rounded-lg border border-event-border p-3 dark:border-gray-700"
      aria-label={t("layoutPreview")}
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
          className="-z-1 object-cover opacity-60 blur-lg"
        />
      )}
      <div
        className="flex min-h-12 items-center gap-3 rounded-lg p-3"
        style={chrome(branding.primary)}
      >
        {icon && (
          <Image
            unoptimized
            alt={icon.name}
            src={icon.url}
            width={100}
            height={32}
            className={
              branding.identity === "wordmark"
                ? "h-8 w-auto"
                : "size-8 object-contain"
            }
          />
        )}
        {branding.identity !== "wordmark" && (
          <div>
            <strong>{branding.organizer || t("eventDetails")}</strong>
            {branding.tagline && <p className="text-sm">{branding.tagline}</p>}
          </div>
        )}
      </div>
      <div
        className="mx-auto w-fit rounded-lg px-4 py-2 text-sm font-medium"
        style={{
          backgroundColor: branding.accent,
          color: eventColorForeground(branding.accent),
        }}
      >
        {t("eventDetails")}
      </div>
      <p
        className="rounded-lg p-3 text-center text-sm"
        style={chrome(branding.footerColor ?? branding.primary)}
      >
        {t("footerPreview")}
      </p>
    </section>
  );
}
