"use client";
import { useState } from "react";
import Image from "next/image";
import BrandingIcon from "./BrandingIcon";
import styles from "./SetupMedia.module.css";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { bannerLayouts, type BannerLayout } from "@/core/event/banner-layout";
import type { EventBranding } from "@/types/event/branding";
import { useModal } from "@/hooks/useModal";
import BannerCropDialog from "./BannerCropDialog";
import SetupBrandingDialog from "./SetupBrandingDialog";

interface Props {
  branding: EventBranding;
  bannerUrl: string | null;
  readOnly: boolean;
  onChange: (changes: Partial<EventBranding>) => boolean;
}
export default function SetupMediaPanel({
  branding,
  bannerUrl,
  readOnly,
  onChange,
}: Props) {
  const t = useTranslations("eventSetup");
  const shortLabel = useTranslations("participantDisplay");
  const upload = useModal(),
    brand = useModal();
  const [pending, setPending] = useState<BannerLayout | null>(null);
  const layout = branding.layout ?? "portrait";
  const size = bannerLayouts[layout];
  const src = branding.banner?.url ?? bannerUrl;
  function select(next: BannerLayout) {
    if (next === layout) return;
    if (src) {
      setPending(next);
      upload.openModal();
    } else onChange({ layout: next });
  }
  return (
    <section className={styles.media}>
      <h2>
        <BrandingIcon name="photograph" />
        {t("bannerRatio")}
      </h2>
      <div className={styles.ratios}>
        {(Object.keys(bannerLayouts) as BannerLayout[]).map((key) => (
          <button
            type="button"
            key={key}
            disabled={readOnly}
            aria-pressed={key === layout}
            onClick={() => select(key)}
          >
            <strong>{bannerLayouts[key].ratio}</strong>
            <span>{t(key)}</span>
          </button>
        ))}
      </div>
      <h3>{t("layoutPreview")}</h3>
      <figure className={styles.figure} data-layout={layout}>
        <div className={styles.device}>
          <div
            className={styles.canvas}
            style={{ aspectRatio: size.width / size.height }}
          >
            {src ? (
              <Image
                unoptimized
                width={size.width}
                height={size.height}
                src={src}
                alt={t("bannerRatio")}
                className="size-full object-cover"
              />
            ) : (
              <>
                <span className={styles.photo}>
                  <BrandingIcon name="photograph" size={27} />
                </span>
                {t("noBanner")}
              </>
            )}
          </div>
          <div className={styles.miniContent}>
            <div className={styles.miniDetail}>
              <strong>
                <BrandingIcon name="document-text" size={14} />
                {t("eventDetails")}
              </strong>
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </div>
            <div className={styles.miniActions}>
              {(["registration", "survey"] as const).map((kind) => (
                <div key={kind}>
                  {shortLabel(kind)}
                  <span aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <figcaption>
          {size.ratio} ·{" "}
          {t("minPixels", { width: size.width, height: size.height })}
        </figcaption>
      </figure>
      <Button
        className={styles.mediaAction}
        variant="outline"
        disabled={readOnly}
        startIcon={<BrandingIcon name="choose-banner" size={18} />}
        onClick={() => {
          setPending(null);
          upload.openModal();
        }}
      >
        {t("upload")}
      </Button>
      <Button
        className={styles.mediaAction}
        variant="outline"
        disabled={readOnly}
        startIcon={<BrandingIcon name="open-branding" size={18} />}
        onClick={brand.openModal}
      >
        {t("branding")}
      </Button>
      {upload.isOpen && (
        <BannerCropDialog
          initialBanner={pending ? (src ?? undefined) : undefined}
          layout={pending ?? layout}
          onClose={upload.closeModal}
          onApply={(banner) => {
            if (!onChange({ banner, layout: pending ?? layout })) return false;
            upload.closeModal();
            return true;
          }}
        />
      )}
      {brand.isOpen && (
        <SetupBrandingDialog
          branding={branding}
          bannerUrl={src}
          onClose={brand.closeModal}
          onSave={onChange}
        />
      )}
    </section>
  );
}
