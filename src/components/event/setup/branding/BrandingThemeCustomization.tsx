"use client";

import BrandingColorPicker from "@/components/event/setup/branding/BrandingColorPicker";
import BannerPalette from "./BannerPalette";
import type { EventBranding } from "@/types/event/branding";
import { useTranslations } from "next-intl";
import { useId } from "react";

interface BrandingThemeCustomizationProps {
  branding: EventBranding;
  bannerUrl: string | null;
  readOnly: boolean;
  onChange: (changes: Partial<EventBranding>) => boolean;
}
export default function BrandingThemeCustomization({
  branding,
  bannerUrl,
  readOnly,
  onChange,
}: BrandingThemeCustomizationProps) {
  const t = useTranslations("eventBranding");
  const paletteId = useId();
  const banner = branding.banner?.url ?? bannerUrl;
  return (
    <div className="space-y-3.5">
      <h3 className="text-preview-control font-semibold text-gray-800 dark:text-gray-200">
        {t("palette")}
      </h3>
      <p className="text-picker-small text-gray-500 dark:text-gray-400">
        {t("paletteHint")}
      </p>
      {banner && <BannerPalette key={banner} id={paletteId} src={banner} />}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {(["primary", "secondary", "accent"] as const).map((key) => (
          <div key={key} className="min-w-0 space-y-1">
            <span className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
              {t(key)}
            </span>
            <BrandingColorPicker
              label={t(key)}
              value={branding[key]}
              paletteId={paletteId}
              disabled={readOnly}
              onSelect={(next) => onChange({ [key]: next })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
