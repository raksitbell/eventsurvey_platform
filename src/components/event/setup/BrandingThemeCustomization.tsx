"use client";

import { eventColorForeground } from "@/core/event/participant-colors";
import BrandingColorPicker from "@/components/event/setup/BrandingColorPicker";
import { useModal } from "@/hooks/useModal";
import type { BrandingColorKey, EventBranding } from "@/types/event/branding";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface BrandingThemeCustomizationProps {
  branding: EventBranding;
  readOnly: boolean;
  onChange: (changes: Partial<EventBranding>) => void;
}
export default function BrandingThemeCustomization({
  branding,
  readOnly,
  onChange,
}: BrandingThemeCustomizationProps) {
  const t = useTranslations("eventBranding");
  const { isOpen, openModal, closeModal } = useModal();
  const [colorKey, setColorKey] = useState<BrandingColorKey>("primary");
  return (
    <div className="space-y-3.5">
      <h3 className="text-preview-control font-semibold text-gray-800 dark:text-gray-200">
        {t("palette")}
      </h3>
      <p className="text-picker-small text-gray-500 dark:text-gray-400">
        {t("paletteHint")}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(["primary", "secondary", "accent"] as const).map((key) => (
          <button
            key={key}
            type="button"
            disabled={readOnly}
            aria-haspopup="dialog"
            onClick={() => {
              setColorKey(key);
              openModal();
            }}
            style={{
              backgroundColor: branding[key],
              color: eventColorForeground(branding[key]),
            }}
            className={`flex h-13.5 min-w-0 flex-col items-start gap-0.5 rounded-preview-control px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-event-action disabled:cursor-default`}
          >
            <span className="text-picker-small font-semibold">{t(key)}</span>
            <span className="text-picker-label">{branding[key]}</span>
          </button>
        ))}
      </div>
      {isOpen && (
        <BrandingColorPicker
          colorKey={colorKey}
          value={branding[colorKey]}
          onSelect={(value) => onChange({ [colorKey]: value })}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
