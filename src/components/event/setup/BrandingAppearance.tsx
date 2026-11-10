"use client";

import BrandingUploadDialog from "@/components/event/setup/BrandingUploadDialog";
import BrandingThemeCustomization from "@/components/event/setup/BrandingThemeCustomization";
import { useModal } from "@/hooks/useModal";
import type { BrandingMediaKind, EventBranding } from "@/types/event/branding";
import { ArrowUpTrayIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface BrandingAppearanceProps {
  branding: EventBranding;
  readOnly: boolean;
  onChange: (changes: Partial<EventBranding>) => boolean;
}
export default function BrandingAppearance({
  branding,
  readOnly,
  onChange,
}: BrandingAppearanceProps) {
  const t = useTranslations("eventBranding");
  const { isOpen, openModal, closeModal } = useModal();
  const [kind, setKind] = useState<BrandingMediaKind>("logo");
  return (
    <section className="min-w-0 space-y-3.5 p-6">
      <h2 className="text-xl leading-6 font-semibold text-gray-900 dark:text-white/90">
        {t("appearance")}
      </h2>
      <BrandingThemeCustomization
        branding={branding}
        readOnly={readOnly}
        onChange={onChange}
      />
      <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
        {t("media")}
      </h3>
      {(["logo", "banner"] as const).map((item) => (
        <div
          key={item}
          className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
        >
          <div className="flex items-center gap-3">
            <ArrowUpTrayIcon
              className="size-5 shrink-0 text-event-action dark:text-brand-400"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-theme-sm font-semibold text-gray-800 dark:text-gray-200">
                {t(item)}
              </p>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                {t(item === "logo" ? "logoHint" : "bannerHint")}
              </p>
            </div>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                setKind(item);
                openModal();
              }}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-event-action px-3 py-2 text-theme-xs font-semibold text-white disabled:opacity-50 dark:bg-event-action"
            >
              <ArrowUpTrayIcon className="size-4" aria-hidden="true" />
              {t("upload")}
            </button>
          </div>
          {branding[item] && (
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {branding[item]?.name}
              </p>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onChange({ [item]: null })}
                aria-label={t("remove", { name: t(item) })}
                className="rounded p-1 text-error-600 disabled:opacity-50 dark:text-error-400"
              >
                <TrashIcon className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ))}
      {isOpen && (
        <BrandingUploadDialog
          kind={kind}
          onClose={closeModal}
          onSelect={(image) => {
            if (!onChange({ [kind]: image })) return false;
            closeModal();
            return true;
          }}
        />
      )}
    </section>
  );
}
