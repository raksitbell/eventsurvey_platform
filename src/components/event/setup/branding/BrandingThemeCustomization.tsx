"use client";

import BrandingColorPicker from "@/components/event/setup/branding/BrandingColorPicker";
import useBannerPalette from "@/hooks/useBannerPalette";
import type { EventBranding } from "@/types/event/branding";
import { useTranslations } from "next-intl";

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
  const palette = useBannerPalette(branding.banner?.url ?? bannerUrl);
  return (
    <div className="space-y-3.5">
      <h3 className="text-preview-control font-semibold text-gray-800 dark:text-gray-200">
        {t("palette")}
      </h3>
      <p className="text-picker-small text-gray-500 dark:text-gray-400">
        {t("paletteHint")}
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-2">
        {(["primary", "secondary", "accent"] as const).map((key) => (
          <div key={key} className="min-w-0 space-y-1">
            <span className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
              {t(key)}
            </span>
            <BrandingColorPicker
              label={t(key)}
              value={branding[key]}
              palette={palette}
              disabled={readOnly}
              onSelect={(next) => onChange({ [key]: next })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
