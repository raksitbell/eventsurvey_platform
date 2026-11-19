"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useModal } from "@/hooks/useModal";
import { eventBrandingEditSchema } from "@/core/event/branding";
import type { BrandingColorKey, EventBranding } from "@/types/event/branding";
import BrandingUploadDialog from "./BrandingUploadDialog";
import BrandingMaterialPreview from "./BrandingMaterialPreview";
import BrandingColorPicker from "./BrandingColorPicker";
import BrandingDialogFrame from "./BrandingDialogFrame";
import BrandingIcon from "./BrandingIcon";
import BrandingIdentitySection from "./BrandingIdentitySection";
import styles from "./BrandingDialog.module.css";

type ColorKey = BrandingColorKey | "gradientEnd" | "footerColor";
type Editor = "identity" | "background" | "primary" | "footerColor" | "accent";
interface Props {
  branding: EventBranding;
  bannerUrl: string | null;
  onClose: () => void;
  onSave: (changes: Partial<EventBranding>) => boolean;
}
export default function SetupBrandingDialog({
  branding,
  bannerUrl,
  onClose,
  onSave,
}: Props) {
  const t = useTranslations("eventSetup");
  const b = useTranslations("eventBranding");
  const visual = useTranslations("eventBrandVisual");
  const [value, setValue] = useState(branding);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [picker, setPicker] = useState<ColorKey | null>(null);
  const upload = useModal();
  const identity = value.identity ?? "icon";
  const asset = identity === "wordmark" ? value.wordmark : value.logo;
  const mode = value.backgroundMode ?? "solid";

  function change(changes: Partial<EventBranding>) {
    setValue((current) => ({ ...current, ...changes }));
    setError("");
  }
  function selectColor(field: ColorKey, hex: string) {
    const changes = { [field]: hex };
    if (!onSave(changes)) return false;
    change(changes);
    return true;
  }
  function color(key: ColorKey) {
    return (
      value[key] ??
      (key === "gradientEnd" || key === "footerColor"
        ? value.primary
        : value.secondary)
    );
  }
  function openEditor(target: Editor) {
    setEditor(target);
    setPicker(null);
  }
  function swatch(field: ColorKey, open: () => void) {
    return (
      <button
        type="button"
        className={styles.swatch}
        onClick={open}
        aria-label={t(field)}
      >
        <span style={{ backgroundColor: color(field) }} />
        {color(field)}
      </button>
    );
  }
  function dismiss() {
    if (picker) setPicker(null);
    else if (editor) setEditor(null);
    else onClose();
  }
  if (upload.isOpen)
    return (
      <BrandingUploadDialog
        kind="logo"
        identityAsset={identity}
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
      onEscape={dismiss}
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
      sidecarKind={editor === "identity" ? "identity" : "material"}
      sidecar={
        editor && (
          <>
            <div className={styles.sideHeading}>
              <h3>
                {visual("materialPreview", {
                  name: t(editor === "identity" ? identity : editor),
                })}
              </h3>
              <button
                type="button"
                aria-label={visual("closePreview")}
                onClick={() => {
                  setEditor(null);
                  setPicker(null);
                }}
              >
                <BrandingIcon name="close" size={18} />
              </button>
            </div>
            {editor === "identity" ? (
              <div className={styles.identitySample}>
                <strong>{t(identity)}</strong>
                <div className={styles.identityHeader}>
                  {asset && (
                    <Image
                      unoptimized
                      src={asset.url}
                      alt={asset.name}
                      width={220}
                      height={54}
                    />
                  )}
                  {(identity === "icon" || !asset) && (
                    <div>
                      <strong>{value.organizer || "EventSurvey"}</strong>
                      {value.tagline && <small>{value.tagline}</small>}
                    </div>
                  )}
                </div>
                <div className={styles.identityContext}>
                  {t("yourEvent")}
                  <span />
                  <span />
                </div>
              </div>
            ) : (
              <BrandingMaterialPreview branding={value} bannerUrl={bannerUrl} />
            )}
            {editor === "background" ? (
              <>
                {mode === "gradient" && (
                  <p className={styles.colorLabel}>{visual("startColor")}</p>
                )}
                {swatch("secondary", () => setPicker("secondary"))}
                {mode === "gradient" && (
                  <>
                    <p className={styles.colorLabel}>{t("gradientEnd")}</p>
                    {swatch("gradientEnd", () => setPicker("gradientEnd"))}
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
              </>
            ) : (
              editor !== "identity" && swatch(editor, () => setPicker(editor))
            )}
            {picker && (
              <BrandingColorPicker
                key={picker}
                embedded
                colorKey={
                  picker === "gradientEnd"
                    ? "secondary"
                    : picker === "footerColor"
                      ? "primary"
                      : picker
                }
                value={color(picker)}
                onSelect={(hex) => selectColor(picker, hex)}
                onClose={() => setPicker(null)}
              />
            )}
          </>
        )
      }
    >
      <div className={styles.settings}>
        <BrandingIdentitySection
          value={value}
          change={change}
          onPreview={() => openEditor("identity")}
          onUpload={upload.openModal}
        />
        <section>
          <h3>
            <BrandingIcon name="photograph" />
            {t("background")}
          </h3>
          <div className={styles.modeRow}>
            <strong>{visual("mode")}</strong>
            <div className={styles.segments}>
              {(["solid", "gradient", "blur"] as const).map((next) => (
                <button
                  type="button"
                  className={styles.control}
                  key={next}
                  disabled={next === "blur" && !bannerUrl}
                  aria-pressed={next === mode}
                  onClick={() => {
                    change({ backgroundMode: next });
                    openEditor("background");
                  }}
                >
                  {visual(next)}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section>
          <h3>
            <BrandingIcon name="palette" />
            {visual("headerFooter")}
          </h3>
          <div className={styles.transparent}>
            <button
              className={styles.control}
              type="button"
              aria-pressed={!!value.transparentChrome}
              onClick={() =>
                change({ transparentChrome: !value.transparentChrome })
              }
            >
              <span aria-hidden />
              {visual("transparent")}
              {value.transparentChrome && <b aria-hidden>✓</b>}
            </button>
            <p>
              {t("transparent")}
              {value.transparentChrome && mode === "gradient" && (
                <small>{visual("continuous")}</small>
              )}
            </p>
          </div>
          {!value.transparentChrome &&
            (["primary", "footerColor"] as const).map((field) => (
              <div className={styles.modeRow} key={field}>
                <strong>{t(field)}</strong>
                {swatch(field, () => openEditor(field))}
              </div>
            ))}
          <div className={styles.modeRow}>
            <strong>{t("accent")}</strong>
            {swatch("accent", () => openEditor("accent"))}
          </div>
        </section>
        {error && (
          <p role="alert" className={styles.error}>
            {t(error)}
          </p>
        )}
      </div>
    </BrandingDialogFrame>
  );
}
