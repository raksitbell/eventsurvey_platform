"use client";
import { useState } from "react";
import Image from "next/image";
import { PhotoIcon } from "@heroicons/react/24/outline";
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
    <section className="min-w-0 space-y-3">
      <h2 className="font-semibold">{t("bannerRatio")}</h2>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(bannerLayouts) as BannerLayout[]).map((key) => (
          <button
            type="button"
            className="event-option min-h-20 text-start aria-pressed:bg-event-tile! aria-pressed:text-participant-text! dark:aria-pressed:bg-gray-700! dark:aria-pressed:text-gray-100!"
            key={key}
            disabled={readOnly}
            aria-pressed={key === layout}
            onClick={() => select(key)}
          >
            <strong>{bannerLayouts[key].ratio}</strong>
            <span className="mt-2 block text-xs">{t(key)}</span>
          </button>
        ))}
      </div>
      <h3 className="font-semibold">{t("layoutPreview")}</h3>
      <div className="event-section space-y-3">
        <div className="mx-auto max-w-64 space-y-3 rounded-lg bg-white p-4 text-sm dark:bg-gray-900">
          <div
            className="flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-event-border bg-event-tile text-event-action dark:bg-gray-800 dark:text-brand-300"
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
                <PhotoIcon className="size-8" />
                {t("noBanner")}
              </>
            )}
          </div>
          <strong>{t("eventDetails")}</strong>
          <div
            aria-hidden
            className="h-1 w-full rounded bg-event-tile dark:bg-gray-700"
          />
          <div
            aria-hidden
            className="h-1 w-3/4 rounded bg-event-tile dark:bg-gray-700"
          />
          <div className="grid grid-cols-2 gap-2">
            {(["registration", "survey"] as const).map((kind) => (
              <div
                key={kind}
                className="event-section flex flex-col items-center gap-1 px-1! py-2! text-xs"
              >
                {t(kind)}
                <span
                  aria-hidden
                  className="size-4 rounded-sm bg-event-action"
                />
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-xs">
          {size.ratio} ·{" "}
          {t("minPixels", { width: size.width, height: size.height })}
        </p>
      </div>
      <Button
        className="w-full"
        variant="outline"
        disabled={readOnly}
        onClick={() => {
          setPending(null);
          upload.openModal();
        }}
      >
        {t("upload")}
      </Button>
      <Button
        className="w-full"
        variant="outline"
        disabled={readOnly}
        onClick={brand.openModal}
      >
        {t("branding")}
      </Button>
      {upload.isOpen && (
        <BannerCropDialog
          initialBanner={pending ? branding.banner?.url : undefined}
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
