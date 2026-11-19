"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import ParticipantDisplayPreview from "@/components/event/participant/ParticipantDisplayPreview";
import type { EventWorkspace } from "@/types/event/workspace";
import BrandingPreviewGallery from "./BrandingPreviewGallery";
import { useModal } from "@/hooks/useModal";
import { bannerLayouts } from "@/core/event/banner-layout";
import { eventBrandingEditSchema } from "@/core/event/branding";
import { getChromeOpacity } from "@/core/event/participant-colors";
import type { BrandingColorKey, EventBranding } from "@/types/event/branding";
import type { ParticipantEventData } from "@/types/event/participant";
import BrandingUploadDialog from "./BrandingUploadDialog";
import BrandingColorPicker from "./BrandingColorPicker";
import useBannerPalette from "@/hooks/useBannerPalette";
import BrandingDialogFrame from "./BrandingDialogFrame";
import BrandingIcon from "./BrandingIcon";
import BrandingIdentitySection from "./BrandingIdentitySection";
import styles from "./BrandingDialog.module.css";

type ColorKey = BrandingColorKey | "gradientEnd" | "footerColor";

interface Props extends ParticipantEventData {
  workspace: EventWorkspace;
  contentLocale?: string | null;
  onClose: () => void;
  onSave: (changes: Partial<EventBranding>) => boolean;
}
export default function SetupBrandingDialog({
  workspace,
  contentLocale,
  branding,
  bannerUrl,
  draft,
  onClose,
  onSave,
}: Props) {
  const t = useTranslations("eventSetup");
  const b = useTranslations("eventBranding");
  const visual = useTranslations("eventBrandVisual");
  const [value, setValue] = useState(branding);
  const [error, setError] = useState<"invalidBrand" | "saveError" | null>(null);
  const palette = useBannerPalette(value.banner?.url ?? bannerUrl);
  const previewTitle = useId();
  const upload = useModal();
  const identity = value.identity ?? "icon";
  const layout = value.layout ?? "portrait";
  const mode = value.backgroundMode ?? "solid";
  const transparency = 100 - getChromeOpacity(value);

  function change(changes: Partial<EventBranding>) {
    setValue((current) => ({ ...current, ...changes }));
    setError(null);
  }

  function colorControl(field: ColorKey, label = t(field)) {
    const hex =
      value[field] ??
      (field === "gradientEnd" ? value.primary : value.secondary);
    return (
      <div className={styles.modeRow} key={field}>
        <strong>{label}</strong>
        <BrandingColorPicker
          label={label}
          value={hex}
          palette={palette}
          onSelect={(next) => change({ [field]: next })}
        />
      </div>
    );
  }

  if (upload.isOpen)
    return (
      <BrandingUploadDialog
        kind="logo"
        identityAsset={identity}
        initialImage={identity === "wordmark" ? value.wordmark : value.logo}
        onClose={upload.closeModal}
        onSelect={(image) => {
          change({ [identity === "wordmark" ? "wordmark" : "logo"]: image });
          upload.closeModal();
          return true;
        }}
      />
    );

  return (
    <BrandingDialogFrame
      title={t("branding")}
      variant="settings"
      onClose={onClose}
      actions={
        <>
          <button type="button" onClick={onClose}>
            {b("cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!eventBrandingEditSchema.safeParse(value).success)
                setError("invalidBrand");
              else if (onSave(value)) onClose();
              else setError("saveError");
            }}
          >
            {t("saveBrand")}
          </button>
        </>
      }
    >
      <div className={styles.settingsLayout}>
        <div
          className={styles.settings}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              event.target instanceof HTMLInputElement &&
              event.target.type !== "color"
            )
              event.preventDefault();
          }}
        >
          <BrandingIdentitySection
            value={value}
            change={change}
            onUpload={upload.openModal}
          />
          <section>
            <h3>
              <BrandingIcon name="photograph" />
              {t("background")}
            </h3>
            <div className={styles.modeRow}>
              <strong>{visual("mode")}</strong>
              <div
                className={styles.segments}
                role="group"
                aria-label={visual("mode")}
              >
                {(["solid", "gradient", "blur"] as const).map((next) => (
                  <button
                    type="button"
                    className={styles.control}
                    key={next}
                    disabled={next === "blur" && !bannerUrl}
                    aria-pressed={next === mode}
                    onClick={() => change({ backgroundMode: next })}
                  >
                    {visual(next)}
                  </button>
                ))}
              </div>
            </div>
            {colorControl(
              "secondary",
              mode === "gradient" ? visual("startColor") : undefined,
            )}
            {mode === "gradient" && (
              <>
                {colorControl("gradientEnd")}
                <button
                  type="button"
                  className={styles.control}
                  onClick={() =>
                    change({
                      gradientAngle: value.gradientAngle === 90 ? 0 : 90,
                    })
                  }
                >
                  {visual(
                    value.gradientAngle === 90 ? "horizontal" : "vertical",
                  )}
                </button>
              </>
            )}
          </section>
          <section>
            <h3>
              <BrandingIcon name="palette" />
              {visual("headerFooter")}
            </h3>
            <label className={styles.modeRow}>
              <strong>{visual("transparency")}</strong>
              <span className={styles.opacityControl}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={transparency}
                  aria-valuetext={`${transparency}%`}
                  onChange={(event) => {
                    const next = 100 - event.currentTarget.valueAsNumber;
                    change({
                      chromeOpacity: next,
                      transparentChrome: next === 0,
                    });
                  }}
                />
                <span aria-hidden="true">{transparency}%</span>
              </span>
            </label>
            {(["primary", "footerColor", "accent"] as const).map((field) =>
              colorControl(field),
            )}
          </section>
        </div>
        <section className={styles.livePreview} aria-labelledby={previewTitle}>
          <div className={styles.previewToolbar}>
            <h3 id={previewTitle}>{b("preview")}</h3>
            <p className={styles.previewRatio}>
              {t("bannerRatio")} {bannerLayouts[layout].ratio}
            </p>
          </div>
          <BrandingPreviewGallery
            className="flex-1"
            viewportClassName={styles.previewViewport}
            workspace={workspace}
            contentLocale={contentLocale}
            draft={draft}
            branding={value}
            bannerUrl={bannerUrl}
          >
            <div className={styles.previewCanvas} data-layout={layout}>
              <ParticipantDisplayPreview
                contentLocale={contentLocale}
                draft={draft}
                branding={value}
                bannerUrl={bannerUrl}
              />
            </div>
          </BrandingPreviewGallery>
        </section>
      </div>
      {error && (
        <p role="alert" className={styles.settingsError}>
          {t(error)}
        </p>
      )}
    </BrandingDialogFrame>
  );
}
