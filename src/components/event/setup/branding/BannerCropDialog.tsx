"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import BrandingDialogFrame from "./BrandingDialogFrame";
import BrandingIcon from "./BrandingIcon";
import styles from "./BrandingDialog.module.css";
import {
  bannerLayouts,
  type BannerLayout,
} from "@/core/event/banner-layout";
import {
  imageUploadError,
  prepareBrandingImage,
  ImageUploadError,
  IMAGE_UPLOAD_ACCEPT,
} from "@/utils/image-upload";
import type { BrandingBanner } from "@/types/event/branding";
import BrandingCropFrame from "./BrandingCropFrame";

interface Props {
  initialBanner?: Omit<BrandingBanner, "name"> & { name?: string };
  layout: BannerLayout;
  onClose: () => void;
  onApply: (image: BrandingBanner) => boolean;
}
export default function BannerCropDialog({
  layout,
  initialBanner,
  onClose,
  onApply,
}: Props) {
  const t = useTranslations("eventSetup"),
    b = useTranslations("eventBranding");
  const visual = useTranslations("eventBrandVisual");
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const originalLoad = useRef<AbortController | null>(null);
  const originalFile = useRef<File | null>(null);
  const initialUrl = initialBanner?.url;
  const initialName = initialBanner?.name;
  const [cropping, setCropping] = useState(!!initialBanner);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );
  const [position, setPosition] = useState(initialBanner?.cropPosition ?? 50);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const url = preview && preview.file === file ? preview.url : "";
  useEffect(() => {
    if (!file) return;
    const next = URL.createObjectURL(file);
    setPreview({ file, url: next });
    return () => URL.revokeObjectURL(next);
  }, [file]);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!initialUrl) return;
    const controller = new AbortController();
    originalLoad.current = controller;
    fetch(initialUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("fileRead");
        return res.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        const extension = IMAGE_UPLOAD_ACCEPT[blob.type]?.[0] ?? "";
        const loaded = new File([blob], initialName ?? `banner${extension}`, {
          type: blob.type,
        });
        originalFile.current = loaded;
        setFile((old) => old ?? loaded);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCropping(false);
          setError("fileRead");
        }
      });
    return () => controller.abort();
  }, [initialName, initialUrl]);
  const size = bannerLayouts[layout];
  async function apply() {
    if (!file || busy) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      const { url, name } = await prepareBrandingImage(file, {
        minimumSize: size,
        optimize: file !== originalFile.current || !initialName,
        signal: controller.signal,
      });
      if (
        !controller.signal.aborted &&
        !onApply({ url, name, cropPosition: position })
      )
        setError("fileStorage");
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof ImageUploadError ? e.code : "fileRead");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const picker = (
    <input
      ref={input}
      id={inputId}
      type="file"
      className="sr-only"
      disabled={busy}
      tabIndex={cropping ? -1 : undefined}
      aria-label={b("chooseFile")}
      accept={Object.entries(IMAGE_UPLOAD_ACCEPT)
        .flatMap(([type, extensions]) => [type, ...extensions])
        .join(",")}
      onChange={(event) => {
        const next = event.target.files?.[0];
        event.target.value = "";
        if (!next) return;
        const issue = imageUploadError(next);
        setError(issue ?? "");
        if (issue) return;
        originalLoad.current?.abort();
        setFile(next);
        setPosition(50);
      }}
    />
  );

  return (
    <BrandingDialogFrame
      title={
        cropping
          ? visual("cropTitle", { ratio: size.ratio })
          : b("uploadBanner")
      }
      variant={cropping ? "crop" : "banner"}
      onClose={onClose}
      actions={
        <>
          <button type="button" onClick={onClose}>
            {b("cancel")}
          </button>
          <button
            type="button"
            disabled={!file || !url || busy}
            onClick={() => {
              if (cropping) void apply();
              else setCropping(true);
            }}
          >
            {busy
              ? b("reading")
              : visual(cropping ? "confirmCrop" : "confirmImage")}
          </button>
        </>
      }
    >
      <div className={styles.formContent}>
        {cropping ? (
          <>
            <p>{visual("positionHint", { ratio: size.ratio })}</p>
            <div className={styles.cropStage}>
              <BrandingCropFrame
                ratio={size.width / size.height}
                src={url}
                name={file?.name}
                disabled={busy}
                position={{ x: position, y: position }}
                onPosition={(next, axis) => setPosition(next[axis])}
              />
              <label className={styles.cropHint}>
                {visual("dragCrop")}
                <span className="sr-only">{t("cropPosition")}</span>
                <input
                  type="range"
                  className="sr-only"
                  aria-label={t("cropPosition")}
                  min="0"
                  max="100"
                  step={1}
                  value={position}
                  disabled={busy}
                  onChange={(event) => setPosition(Number(event.target.value))}
                />
              </label>
            </div>
            <p>
              {visual("cropMinimum", {
                width: size.width,
                height: size.height,
              })}
            </p>
            {(initialBanner || error) && (
              <>
                {picker}
                <button
                  type="button"
                  className={styles.control}
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  {visual("replaceBanner")}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <label className={styles.drop} htmlFor={inputId}>
              {picker}
              <BrandingIcon name="upload" size={28} />
              {b("chooseFile")}
            </label>
            <p>{visual("chooseLayout")}</p>
            <p>{visual("bannerHint")}</p>
            <p role="status">{file?.name ?? visual("noBannerSelection")}</p>
          </>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error === "cropSize"
              ? t("cropSize", { width: size.width, height: size.height })
              : b(error)}
          </p>
        )}
      </div>
    </BrandingDialogFrame>
  );
}
